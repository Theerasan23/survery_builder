import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text", placeholder: "admin" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
                }

                const apiUrl = process.env.INTERNAL_API_URL || "http://localhost:3001/api";

                try {
                    const res = await fetch(`${apiUrl}/users/login`, {
                        method: 'POST',
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            username: credentials.username,
                            password: credentials.password,
                        })
                    });

                    const data = await res.json();

                    if (res.ok && data?.id) {
                        return data;
                    }

                    throw new Error(data?.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
                } catch (error) {
                    if (error instanceof TypeError) {
                        // Network error (backend unreachable)
                        console.error("Auth API unreachable:", error.message);
                        throw new Error("ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่");
                    }
                    throw error;
                }
            }
        })
    ],
    pages: {
        signIn: '/login', // Custom login page
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.role = user.role;
                token.position = user.position;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.username = token.username;
                session.user.role = token.role;
                session.user.position = token.position;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
