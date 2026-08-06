#!/bin/sh
# Scan MySQL binlogs for responses/answers that a form edit deleted.
#
# Run this on the production DB host. It only reads: it prints when each
# DELETE happened, how many rows it removed, and which forms were affected.
# Nothing is written or changed.
#
#   ./scan-deleted-responses.sh [container_name] [mysql_root_password]

CONTAINER="${1:-form_db}"
PASSWORD="${2:-123456}"
DB="form_db"
MYSQLBINLOG="/usr/libexec/mysqlsh/mysqlbinlog"

echo "=== 1. Can the binlog be used for recovery? ==="
docker exec "$CONTAINER" mysql -uroot -p"$PASSWORD" -e "
SHOW VARIABLES WHERE Variable_name IN
 ('log_bin','binlog_format','binlog_row_image','binlog_expire_logs_seconds');" 2>/dev/null
echo "  log_bin=ON, binlog_format=ROW, binlog_row_image=FULL are all required."
echo

echo "=== 2. Binlogs on disk (oldest file = how far back recovery can reach) ==="
docker exec "$CONTAINER" sh -c 'ls -la --time-style=long-iso /var/lib/mysql/binlog.0* 2>/dev/null | grep -v index'
echo

echo "=== 3. DELETE events against $DB.responses ==="
FILES=$(docker exec "$CONTAINER" sh -c 'ls /var/lib/mysql/binlog.0* 2>/dev/null | grep -v index')
TOTAL=0
for f in $FILES; do
    count=$(docker exec "$CONTAINER" sh -c \
        "$MYSQLBINLOG --base64-output=DECODE-ROWS -v --database=$DB '$f' 2>/dev/null \
         | grep -c '^### DELETE FROM \`$DB\`.\`responses\`'")
    count=${count:-0}
    if [ "$count" -gt 0 ]; then
        echo "  $(basename "$f"): $count rows deleted"
        # Timestamps of the transactions that contain those deletes
        docker exec "$CONTAINER" sh -c \
            "$MYSQLBINLOG --base64-output=DECODE-ROWS -v --database=$DB '$f' 2>/dev/null \
             | grep -B 40 '^### DELETE FROM \`$DB\`.\`responses\`' \
             | grep -oE '^#[0-9]{6} [0-9: ]+' | sort -u | tail -20 | sed 's/^/      at /'"
        TOTAL=$((TOTAL + count))
    fi
done
echo "  ---> total responses rows deleted across all retained binlogs: $TOTAL"
echo

if [ "$TOTAL" -gt 0 ]; then
    echo "=== 4. Which forms lost rows (column @2 = form_id) ==="
    for f in $FILES; do
        docker exec "$CONTAINER" sh -c \
            "$MYSQLBINLOG --base64-output=DECODE-ROWS -v --database=$DB '$f' 2>/dev/null \
             | grep -A 3 '^### DELETE FROM \`$DB\`.\`responses\`' | grep '@2=' | sed 's/###   @2=//'"
    done | sort | uniq -c | sed 's/^/   rows=/'
    echo
    echo "Recoverable. Save the binlogs off this host before they expire:"
    echo "   docker exec $CONTAINER sh -c 'tar cf - /var/lib/mysql/binlog.0*' > binlogs-\$(date +%F).tar"
else
    echo "No DELETE against $DB.responses in the retained binlogs."
    echo "Either no form was edited in this window, or the events have already expired."
fi
