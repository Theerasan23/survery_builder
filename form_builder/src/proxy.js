import { withAuth } from "next-auth/middleware";

// Secure all admin routes
export default withAuth(
    function middleware(req) {
        // Any custom logic can go here
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token, // Return true if valid token exists
        },
        pages: {
            signIn: '/login', // Redirect here if unauthenticated
        }
    }
);

export const config = {
    // Only protect /admin and all its sub-routes
    matcher: ["/admin/:path*"]
};
