#!/usr/bin/env node
// Politique d'audit de dependances pour l'app mobile (voir SECURITY.md a la
// racine du depot pour le detail et la date de chaque risque accepte).
//
// npm audit --omit=dev ne suffit pas ici : contrairement au frontend, la
// chaine Expo/Metro/React Native vulnerable (constat de l'audit DevSecOps)
// vit dans "dependencies", pas "devDependencies" - Expo ne separe pas
// outillage et code embarque de la meme facon qu'un projet web.
//
// On filtre donc par NOM DE PAQUET plutot que par outil tiers (audit-ci) :
// le format d'allowlist d'audit-ci exige le chemin complet de la chaine de
// dependances ("GHSA-id|pkg>pkg>pkg"), qui change au moindre lockfile mis a
// jour et casse silencieusement la protection. Un nom de paquet est stable.
//
// Echoue si npm audit remonte une vulnerabilite sur un paquet qui n'est PAS
// dans la liste ci-dessous (du nouveau, donc a traiter) ; reste vert si
// seuls les paquets deja documentes dans SECURITY.md sont concernes.

import { execSync } from 'node:child_process';

// Chaine Expo 44 / Metro / React Native requise pour corriger (changement
// majeur, hors perimetre tant que le projet n'est pas pret a migrer) +
// node-forge (via @expo/code-signing-certificates, meme chaine).
// Documente dans SECURITY.md sous "Mobile".
const PAQUETS_ACCEPTES = new Set([
  '@expo/cli',
  '@expo/code-signing-certificates',
  '@expo/config',
  '@expo/config-plugins',
  '@expo/inline-modules',
  '@expo/local-build-cache-provider',
  '@expo/metro',
  '@expo/metro-config',
  '@expo/prebuild-config',
  '@react-native-community/datetimepicker',
  '@react-native/community-cli-plugin',
  '@react-native/virtualized-lists',
  'braces',
  'expo',
  'expo-sharing',
  'metro',
  'metro-config',
  'metro-file-map',
  'metro-transform-worker',
  'micromatch',
  'node-forge',
  'react-native',
  'uuid',
  'xcode',
]);

function runNpmAudit() {
  try {
    return execSync('npm audit --json', { encoding: 'utf8' });
  } catch (err) {
    // npm audit sort en erreur (code != 0) des qu'il trouve quoi que ce
    // soit : le JSON est quand meme sur stdout, c'est lui qui nous interesse.
    if (err.stdout) return err.stdout;
    throw err;
  }
}

const rapport = JSON.parse(runNpmAudit());
const trouves = Object.keys(rapport.vulnerabilities ?? {});
const nouveaux = trouves.filter((nom) => !PAQUETS_ACCEPTES.has(nom));

if (nouveaux.length > 0) {
  console.error(
    `Nouvelle(s) vulnerabilite(s) npm non documentee(s) dans SECURITY.md : ${nouveaux.join(', ')}`
  );
  console.error('Ajoutez-les a SECURITY.md (risque accepte, avec raison et date) ou corrigez-les avant de les ajouter a PAQUETS_ACCEPTES dans ce script.');
  process.exit(1);
}

console.log(
  trouves.length > 0
    ? `OK : ${trouves.length} vulnerabilite(s) connue(s) et deja acceptee(s) (voir SECURITY.md) : ${trouves.join(', ')}`
    : 'OK : aucune vulnerabilite.'
);
