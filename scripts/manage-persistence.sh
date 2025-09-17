#!/bin/bash

# Script utilitaire pour la gestion de la persistance des données Firebase

EMULATOR_DATA_DIR="./emulator-data"
# Port du Hub des émulateurs (API export/import)
HUB_PORT=${FIREBASE_EMULATOR_HUB_PORT:-4400}
# Détection du projectId (priorité: env → fallback local)
PROJECT_ID=${VITE_FB_PROJECT_ID:-${GCLOUD_PROJECT:-keydispo-ec1ba}}

show_help() {
    echo "🔧 Gestionnaire de persistance Firebase - KeyDispo"
    echo ""
    echo "Usage: $0 [COMMANDE]"
    echo ""
    echo "Commandes disponibles:"
    echo "  save      - Sauvegarder les données actuelles de l'émulateur"
    echo "  restore   - Démarrer l'émulateur avec les données sauvegardées"
    echo "  clean     - Supprimer toutes les données sauvegardées"
    echo "  status    - Afficher l'état des données sauvegardées"
    echo "  backup    - Créer une sauvegarde horodatée"
    echo "  list      - Lister les sauvegardes disponibles"
    echo "  help      - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 save     # Sauvegarder les données actuelles"
    echo "  $0 restore  # Démarrer avec données sauvegardées"
    echo "  $0 clean    # Supprimer toutes les données"
}

hub_available() {
  curl -s http://localhost:${HUB_PORT}/emulators > /dev/null 2>&1
}

save_data() {
    echo "💾 Sauvegarde des données de l'émulateur..."
    
    if ! hub_available; then
        echo "❌ Le Hub d'émulateur Firebase n'est pas en cours d'exécution (port ${HUB_PORT})"
        echo "   Impossible de sauvegarder les données"
        exit 1
    fi
    
    mkdir -p "$EMULATOR_DATA_DIR"
    
    # Utiliser l'API officielle du Hub: POST /_admin/export
    curl -sS -X POST "http://localhost:${HUB_PORT}/_admin/export" \
      -H "Content-Type: application/json" \
      -d "{\"path\": \"$EMULATOR_DATA_DIR\", \"initiatedBy\": \"manual\"}" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Données sauvegardées dans $EMULATOR_DATA_DIR (project: ${PROJECT_ID})"
        show_status
    else
        echo "❌ Erreur lors de la sauvegarde"
        exit 1
    fi
}

restore_data() {
    echo "📦 Démarrage de l'émulateur avec données sauvegardées..."
    
    if [ ! -d "$EMULATOR_DATA_DIR" ] || [ -z "$(ls -A $EMULATOR_DATA_DIR)" ]; then
        echo "❌ Aucune donnée sauvegardée trouvée dans $EMULATOR_DATA_DIR"
        echo "   Démarrage avec données vides..."
        firebase emulators:start --export-on-exit="$EMULATOR_DATA_DIR"
    else
        echo "✅ Données trouvées, import automatique activé"
        firebase emulators:start --import="$EMULATOR_DATA_DIR" --export-on-exit="$EMULATOR_DATA_DIR"
    fi
}

clean_data() {
    echo "🗑️  Suppression des données sauvegardées..."
    
    if [ -d "$EMULATOR_DATA_DIR" ]; then
        read -p "⚠️  Êtes-vous sûr de vouloir supprimer toutes les données ? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            rm -rf "$EMULATOR_DATA_DIR"
            echo "✅ Données supprimées"
        else
            echo "❌ Opération annulée"
        fi
    else
        echo "✅ Aucune donnée à supprimer"
    fi
}

show_status() {
    echo "📊 État des données sauvegardées:"
    echo ""
    
    if [ ! -d "$EMULATOR_DATA_DIR" ]; then
        echo "❌ Dossier de sauvegarde inexistant"
        return
    fi
    
    if [ -z "$(ls -A $EMULATOR_DATA_DIR)" ]; then
        echo "📂 Dossier de sauvegarde vide"
        return
    fi
    
    echo "📁 Dossier: $EMULATOR_DATA_DIR"
    echo "📅 Dernière modification: $(stat -f "%Sm" "$EMULATOR_DATA_DIR" 2>/dev/null || date -r "$EMULATOR_DATA_DIR" 2>/dev/null || echo "Non disponible")"
    echo ""
    echo "📋 Contenu:"
    
    for service in auth_export firestore_export database_export; do
        if [ -d "$EMULATOR_DATA_DIR/$service" ]; then
            echo "  ✅ $service"
            case $service in
                "auth_export")
                    if [ -f "$EMULATOR_DATA_DIR/$service/accounts.json" ]; then
                        count=$(jq '.users | length' "$EMULATOR_DATA_DIR/$service/accounts.json" 2>/dev/null || echo "?")
                        echo "     👤 $count utilisateurs"
                    fi
                    ;;
                "firestore_export")
                    size=$(du -sh "$EMULATOR_DATA_DIR/$service" 2>/dev/null | cut -f1 || echo "?")
                    echo "     📄 Taille: $size"
                    ;;
                "database_export")
                    size=$(du -sh "$EMULATOR_DATA_DIR/$service" 2>/dev/null | cut -f1 || echo "?")
                    echo "     🗃️  Taille: $size"
                    ;;
            esac
        else
            echo "  ❌ $service (manquant)"
        fi
    done
}

create_backup() {
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_dir="./backups/emulator-data-$timestamp"
    
    echo "📦 Création d'une sauvegarde horodatée..."
    
    if [ ! -d "$EMULATOR_DATA_DIR" ] || [ -z "$(ls -A $EMULATOR_DATA_DIR)" ]; then
        echo "❌ Aucune donnée à sauvegarder"
        exit 1
    fi
    
    mkdir -p "./backups"
    cp -r "$EMULATOR_DATA_DIR" "$backup_dir"
    
    echo "✅ Sauvegarde créée: $backup_dir"
}

list_backups() {
    echo "📚 Sauvegardes disponibles:"
    echo ""
    
    if [ ! -d "./backups" ]; then
        echo "❌ Aucun dossier de sauvegarde trouvé"
        return
    fi
    
    for backup in ./backups/emulator-data-*; do
        if [ -d "$backup" ]; then
            basename_backup=$(basename "$backup")
            timestamp=${basename_backup#emulator-data-}
            formatted_date=$(date -j -f "%Y%m%d_%H%M%S" "$timestamp" "+%d/%m/%Y à %H:%M:%S" 2>/dev/null || echo "$timestamp")
            echo "📁 $basename_backup (créée le $formatted_date)"
        fi
    done
    
    if ! ls ./backups/emulator-data-* > /dev/null 2>&1; then
        echo "❌ Aucune sauvegarde trouvée"
    fi
}

# Main
case "$1" in
    "save")
        save_data
        ;;
    "restore")
        restore_data
        ;;
    "clean")
        clean_data
        ;;
    "status")
        show_status
        ;;
    "backup")
        create_backup
        ;;
    "list")
        list_backups
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo "❌ Commande inconnue: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
