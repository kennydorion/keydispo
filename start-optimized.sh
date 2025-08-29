#!/bin/bash

# 🚀 Script de Démarrage Optimisé pour Firebase Emulator
# Ce script optimise les performances en réduisant les logs et en configurant la JVM

echo "🧹 Nettoyage des logs..."
rm -f firebase-debug.log firestore-debug.log database-debug.log emulator.log .vite.log

echo "⚙️ Configuration des variables d'optimisation..."
export FIRESTORE_EMULATOR_LOG_LEVEL=WARN
export FIREBASE_EMULATOR_LOG_LEVEL=WARN
export JAVA_OPTS="-Xmx1g -XX:+UseG1GC -XX:+UnlockExperimentalVMOptions -XX:+UseZGC"
export FIREBASE_DEBUG=false

echo "🚀 Démarrage de l'émulateur en mode optimisé..."
echo "   - Logs réduits (WARN only)"
echo "   - Mémoire JVM limitée à 1GB"
echo "   - Garbage Collector optimisé"

# Démarrer les émulateurs sans import automatique pour un démarrage plus rapide
firebase emulators:start --only firestore,auth,database,ui --project keydispo-ec1ba
