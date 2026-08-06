#!/bin/sh
# Scan MySQL binlogs for responses that a form edit deleted.
#
# Read-only: it reports when each DELETE ran, how many rows it removed and which
# forms were hit. Nothing is written or changed.
#
#   ./scan-deleted-responses.sh [container_name]
#
# The password asked for is the MySQL *root* password (MYSQL_ROOT_PASSWORD in the
# server's .env) — not an SSH or website login. It is read without echoing so it
# does not land in shell history, and is passed to MySQL through MYSQL_PWD rather
# than on a command line. Works whether MySQL runs in Docker or on the host.

CONTAINER="${1:-form_db}"
DB="${DB:-form_db}"

if [ -n "$2" ]; then
    PW="$2"                       # accepted, but prefer the prompt
elif [ -n "$MYSQL_ROOT_PW" ]; then
    PW="$MYSQL_ROOT_PW"
else
    printf 'MySQL root password (will not be shown): ' >&2
    stty -echo 2>/dev/null
    read -r PW
    stty echo 2>/dev/null
    printf '\n' >&2
fi

# Reaching the Docker socket often needs sudo; fall back to it before giving up,
# otherwise a permission error looks exactly like "container not found".
DOCKER=""
if docker info >/dev/null 2>&1; then
    DOCKER="docker"
elif command -v docker >/dev/null 2>&1; then
    echo "Docker needs sudo on this host — you may be asked for your sudo password."
    if sudo docker info >/dev/null 2>&1; then
        DOCKER="sudo docker"
    fi
fi

if [ -n "$DOCKER" ] && $DOCKER inspect "$CONTAINER" >/dev/null 2>&1; then
    MODE=docker
    echo "MySQL in Docker container: $CONTAINER"
elif [ -n "$DOCKER" ]; then
    echo "Docker is reachable but there is no container named '$CONTAINER'."
    echo "Pick the MySQL one from:  $DOCKER ps --format '{{.Names}}\t{{.Image}}'"
    exit 1
else
    MODE=host
    echo "Docker is not reachable — using MySQL on this host."
fi
echo

# Run a snippet where mysql/mysqlbinlog live, with the password supplied via MYSQL_PWD.
run() {
    if [ "$MODE" = docker ]; then
        $DOCKER exec -e MYSQL_PWD="$PW" "$CONTAINER" sh -c "$1" 2>/dev/null
    else
        MYSQL_PWD="$PW" sh -c "$1" 2>/dev/null
    fi
}

if ! run 'mysql -uroot -N -e "SELECT 1"' | grep -q 1; then
    echo "Could not connect as root. Check the password and container name."
    exit 1
fi

echo "=== 1. Can the binlog be used for recovery? ==="
run 'mysql -uroot -e "SHOW VARIABLES WHERE Variable_name IN (\"log_bin\",\"binlog_format\",\"binlog_row_image\",\"binlog_expire_logs_seconds\")"'
echo "  Recovery needs log_bin=ON, binlog_format=ROW, binlog_row_image=FULL."
echo

BASENAME=$(run 'mysql -uroot -N -e "SELECT @@log_bin_basename"')
if [ -z "$BASENAME" ]; then
    echo "Binary logging is off — the deleted rows are not recoverable from this server."
    exit 1
fi

MYSQLBINLOG=$(run 'command -v mysqlbinlog 2>/dev/null || ls /usr/libexec/mysqlsh/mysqlbinlog 2>/dev/null' | head -1)
if [ -z "$MYSQLBINLOG" ]; then
    echo "mysqlbinlog not found. Copy the binlogs to a machine that has MySQL client tools."
    exit 1
fi

echo "=== 2. Binlogs on disk (oldest file = how far back recovery reaches) ==="
run "ls -la --time-style=long-iso ${BASENAME}.0* | grep -v index"
echo

echo "=== 3. DELETE events against ${DB}.responses ==="
FILES=$(run "ls ${BASENAME}.0* | grep -v index")
TOTAL=0
for f in $FILES; do
    count=$(run "$MYSQLBINLOG --base64-output=DECODE-ROWS -v --database=$DB '$f' | grep -c '^### DELETE FROM \`$DB\`.\`responses\`'")
    count=$(echo "$count" | tr -dc '0-9')
    [ -z "$count" ] && count=0
    if [ "$count" -gt 0 ]; then
        echo "  $(basename "$f"): $count rows deleted"
        run "$MYSQLBINLOG --base64-output=DECODE-ROWS -v --database=$DB '$f' \
             | grep -B 40 '^### DELETE FROM \`$DB\`.\`responses\`' \
             | grep -oE '^#[0-9]{6} [0-9: ]+' | sort -u | tail -20" | sed 's/^/      at /'
        TOTAL=$((TOTAL + count))
    fi
done
echo "  ---> total responses rows deleted across all retained binlogs: $TOTAL"
echo

if [ "$TOTAL" -gt 0 ]; then
    echo "=== 4. Which forms lost rows (@2 = form_id) ==="
    for f in $FILES; do
        run "$MYSQLBINLOG --base64-output=DECODE-ROWS -v --database=$DB '$f' \
             | grep -A 3 '^### DELETE FROM \`$DB\`.\`responses\`' | grep '@2=' | sed 's/###   @2=//'"
    done | sort | uniq -c | sed 's/^/   rows=/'
    echo
    echo "Recoverable. Save the binlogs off this host before they expire:"
    if [ "$MODE" = docker ]; then
        echo "   $DOCKER exec $CONTAINER sh -c 'tar cf - ${BASENAME}.0*' > binlogs-\$(date +%F).tar"
    else
        echo "   tar cf binlogs-\$(date +%F).tar ${BASENAME}.0*"
    fi
else
    echo "No DELETE against ${DB}.responses in the retained binlogs."
    echo "Either no form was edited in this window, or those events have already expired."
fi
