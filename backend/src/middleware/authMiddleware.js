import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !/^Bearer\s+[^\s]+$/.test(authHeader)) {
            return res.status(401).json({
                message: "Authentication required."
            });
        }

const token = authHeader.slice(7);
        if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
            return res.status(401).json({ message: "Invalid authentication token." });
        }

const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET,
    {
        algorithms: ["HS256"],
        issuer: "vaultflow-api",
        audience: "vaultflow-client"
    }
);
        req.user = decoded;
        

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token."
        });
    }
};

export default authMiddleware;
