import { Telegraf } from 'telegraf';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import 'dotenv/config';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// Correction de l'initialisation de Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });

// Bloc de diagnostic temporaire
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERREUR : La variable GEMINI_API_KEY est introuvable ou vide dans Railway !");
} else {
    console.log("✅ GEMINI_API_KEY détectée (Longueur : " + process.env.GEMINI_API_KEY.length + " caractères)");
}

// 1. Commande de démarrage avec sauvegarde utilisateur dans Firebase
bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    
    try {
        await setDoc(doc(db, "users", userId), {
            username: ctx.from.username || "Inconnu",
            firstName: ctx.from.first_name,
            lastSeen: serverTimestamp()
        }, { merge: true });

        ctx.reply(`Bienvenue chez Amateur De Fantaisie, ${ctx.from.first_name} ! Je suis ton assistant IA connecté.`);
    } catch (error) {
        console.error("Erreur d'enregistrement Firebase :", error);
        ctx.reply("Bienvenue ! (Note : Impossible de mettre à jour votre profil dans la BDD).");
    }
});

// 2. Traitement des messages par l'IA
bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return; 

    try {
        await ctx.sendChatAction('typing');

        // Appel à l'IA
        const result = await model.generateContent(ctx.message.text);
        const responseText = result.response.text();

        await ctx.reply(responseText);
    } catch (error) {
        console.error("Erreur IA :", error);
        await ctx.reply("Une erreur est survenue avec l'IA.");
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
