# Démarrage rapide : l’interface et les bases

OfficeVega est une suite bureautique qui fonctionne entièrement sur votre machine : une fenêtre, une rangée d’onglets, six éditeurs — Docs (traitement de texte), Sheets (tableurs), Slides (présentations), PDF, Markdown et HTML. Les fichiers sont de vrais .docx / .xlsx / .pptx / .pdf, totalement interchangeables avec Word, Excel et PowerPoint. Aucune connexion réseau n’est nécessaire.

## Aperçu de l’interface

![L’écran d’accueil](img/home-screen.png)

La fenêtre comporte trois parties :

- **Barre d’onglets (en haut)** : chaque fichier ouvert correspond à un onglet. L’onglet Accueil, le plus à gauche, est toujours présent et ne peut pas être fermé ; les autres onglets sont vos documents. Un double-clic sur un onglet permet de renommer le fichier sur place.
- **Zone de contenu** : l’éditeur (ou l’accueil) correspondant à l’onglet actif.
- **Barre de menus** : en haut de la fenêtre sous Windows. Les menus Fichier, Édition et Affichage s’adaptent à l’éditeur actif.

## Créer un document

Chacun de ces moyens convient :

- Cliquez sur une carte de création rapide de la section [Démarrage rapide](help://getting-started) de l’**accueil** (AI Docs, AI Sheets, AI Slides, …).
- Menu **Fichier ▸ Nouveau** : Docs (ctrl+N), Sheets, Slides, Markdown, HTML ou PDF.
- Faites glisser un fichier sur la fenêtre, ou double-cliquez dessus dans votre gestionnaire de fichiers (si OfficeVega est l’application par défaut).

Un nouveau document s’ouvre sans titre ; le fichier sur le disque n’est créé qu’à la première sauvegarde.

## Ouvrir des fichiers

- Le menu **Fichier ▸ Ouvrir** (ctrl+O) ouvre le sélecteur du système : .docx / .doc / .xlsx / .xls / .csv / .tsv / .pptx / .ppt / .pdf / .md / .html.
- Cliquez sur n’importe quel élément de la liste **Récents** de l’accueil.
- `officevega <file>` depuis un terminal ouvre aussi les fichiers.

## Le modèle d’enregistrement

- **Enregistrement manuel** : ctrl+S, ou Fichier ▸ Enregistrer / Enregistrer sous. Le premier enregistrement demande l’emplacement et le nom.
- **L’enregistrement automatique** ne s’active qu’après avoir enregistré le fichier manuellement au moins une fois : un PDF que vous ne faites que lire n’est jamais réécrit en silence. Il se déclenche peu après une modification du contenu.
- Fermer un onglet contenant des modifications non enregistrées demande d’abord : Enregistrer / Ne pas enregistrer / Annuler.
- Chaque écriture est atomique (fichier temporaire puis renommage) : une coupure de courant ne peut pas laisser un fichier à moitié écrit.

## Raccourcis courants

| Action           | Windows |
| ---------------- | ------- |
| Nouveau document | ctrl+N  |
| Ouvrir           | ctrl+O  |
| Enregistrer      | ctrl+S  |
| Fermer l’onglet  | ctrl+W  |
| Ouvrir ce manuel | F1      |
| Réduire le ruban | Ctrl+F1 |

**La réduction du ruban** fonctionne dans tous les éditeurs. La rangée d'onglets reste en place et la bande de commandes qui se trouve en dessous disparaît ; l'onglet sélectionné sert aussi de commande de réduction : tant que le ruban est réduit, aucun onglet n'est sélectionné, et appuyer sur n'importe quel onglet fait revenir la bande. Un double-clic sur un onglet fait de même. La façon dont vous l'avez laissée est mémorisée éditeur par éditeur. Docs ajoute une densité intermédiaire : **⌥⌘K** / Ctrl+Alt+K compacte le bandeau en icônes seules, mémorisé de la même façon.

Les raccourcis propres à chaque éditeur (reproduire la mise en forme, rechercher et remplacer, opérations sur les tableaux, …) sont décrits dans leurs chapitres ; Docs propose en plus une boîte de dialogue consultable des raccourcis clavier (**ctrl+/**) qui couvre l’ensemble de ses combinaisons.

<!--
## Les raccourcis Option+Commande

Option+Commande est la couche que Word réserve aux sauts structurés, et OfficeVega la remplit de la même façon. Docs en prend l’essentiel, Sheets en prend deux pour la compatibilité avec Excel ; un raccourci fonctionne partout.

**Docs**

| Raccourci (macOS) | Effet                           | Windows / Linux    |
| ----------------- | ------------------------------- | ------------------ |
| ⌥⌘1 / ⌥⌘2 / ⌥⌘3   | Titre 1 / 2 / 3                 | Ctrl+Alt+1 / 2 / 3 |
| ⌥⌘0               | Normal                          | Ctrl+Alt+0         |
| ⌥⌘M               | Paragraphe                      | Ctrl+Alt+M         |
| ⌥⌘A               | Nouveau commentaire             | Ctrl+Alt+A         |
| ⌥⌘F               | Insérer une note de bas de page | Ctrl+Alt+F         |
| ⌥⌘E               | Insérer une note de fin         | Ctrl+Alt+D         |
| ⌥⌘G               | Atteindre                       | Ctrl+G             |

Deux d’entre eux changent sous Windows, pour la même raison que Word les sépare. **macOS réserve ⌥⌘D** — il affiche et masque le Dock —, si bien que la note de fin est ⌥⌘E sur Mac et Ctrl+Alt+D partout ailleurs. Et **Atteindre** laisse tomber l’Alt : Ctrl+G, là où le raccourci Mac le conserve.

**Sheets**, quand la grille a le focus

| Raccourci (macOS) | Effet                | Windows / Linux |
| ----------------- | -------------------- | --------------- |
| ⌥⌘0               | Bordures extérieures | Ctrl+Shift+7    |
| ⌥⌘−               | Aucune bordure       | Ctrl+Shift+−    |

Windows n’est pas une réécriture de la paire Mac. Excel pour Mac donne à Sheets **les deux** : ⌘⇧7 et ⌥⌘0 sont deux touches pour les mêmes bordures extérieures, si bien que sous Windows la commande garde la combinaison Ctrl+Shift qu’elle avait déjà, et la couche Option est tout simplement absente.

À noter : **⌥⌘0 signifie Normal dans Docs et Bordures extérieures dans Sheets**. Les deux n’apparaissent jamais dans le même éditeur, donc rien n’entre en collision à l’usage, mais ⌥⌘0 est déjà pris et n’est pas disponible comme raccourci global.

**Tous les éditeurs** : **⌥⌘R / Ctrl+F1** réduit le ruban, comme décrit plus haut.

Cela laisse ⌥⌘D libre pour que OfficeVega l’utilise sur macOS si une future commande en a besoin.
-->

## Pour aller plus loin

- Où se trouvent les fichiers : [L’écran d’accueil](help://home-screen).
- Gérer beaucoup de fichiers ouverts : [Onglets et gestion des fenêtres](help://tabs-and-windows).
- Confier le travail à l’IA : [Le panneau d’assistant IA](help://ai-panel).
- Langue, thème, applications par défaut : [Paramètres, langue, thème et intégrations MCP](help://settings-integrations).

Besoin d’aide ? Posez votre question sur [officevega.com/feedback](https://officevega.com/feedback), suivez les actualités sur la chaîne Telegram [t.me/getmyai](https://t.me/getmyai), ou écrivez à [mail@vega.chat](mailto:mail@vega.chat).
