import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";

/**
 * Import your Room files
 */
import { PvPRoom } from "./rooms/PvPRoom";

export default config({

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('pvp_room', PvPRoom);

        // Configure CORS for production
        gameServer.define('pvp_room', PvPRoom, {
            // Enable CORS for all origins in production
            cors: {
                origin: process.env.CORS_ORIGIN || "*",
                credentials: true
            }
        });
    },

    initializeExpress: (app) => {
        // Enable CORS for Express
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        /**
         * Bind your custom express routes here:
         * Read more: https://expressjs.com/en/starter/basic-routing.html
         */
        app.get("/hello_world", (req, res) => {
            res.send("Last War PvP Server is running!");
        });

        // Health check endpoint
        app.get("/health", (req, res) => {
            res.json({ 
                status: "healthy", 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/monitor", monitor());
    },

    beforeListen: () => {
        console.log(`🚀 Last War PvP Server starting on port ${process.env.PORT || 2567}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
    }
});