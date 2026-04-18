// ============================================================
// config/db.js — Connexion à MongoDB Atlas via Mongoose
// ============================================================

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Tentative de connexion avec l'URI depuis .env
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Ces options évitent les warnings de dépréciation Mongoose
            // useNewUrlParser et useUnifiedTopology sont activés par défaut en Mongoose 8+
        });

        console.log(`✅ MongoDB Atlas connecté : ${conn.connection.host}`);
        console.log(`📚 Base de données : ${conn.connection.name}`);

    } catch (error) {
        // Si la connexion échoue, afficher l'erreur et arrêter le serveur
        console.error('❌ Erreur de connexion MongoDB :', error.message);
        console.error('💡 Vérifier MONGO_URI dans backend/.env');
        process.exit(1); // Code 1 = erreur
    }
};

module.exports = connectDB;