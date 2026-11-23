# Notes de test : Concord MCP v0.23.0

Test réalisé le 23/11/2026 sous Windows 11, Node 22.15, depuis Claude Code (extension VS Code).
Projet test : un petit module todo (`src/todo.js`) sur lequel deux agents travaillent en même temps.

## Scénario joué

| # | Agent | Action Concord | Résultat |
|---|-------|----------------|----------|
| 1 | Claude Code | `start_work` TODO-1, réserve `src/todo.js` | OK, 0 chevauchement |
| 2 | Codex | `start_work` TODO-2 sur le même fichier | **Refusé** : « TODO-1 (claude-code:c7db22ab): src/todo.js » |
| 3 | Codex | `update_work prompt` → Claude | Message mis en file |
| 4 | Claude Code | `inbox drain` + `update_work reply` | Réponse : « garde tout dans todo.js, je te passe la tâche » |
| 5 | Claude Code | code `toggleTodo` + tests, `transfer_work offer` | `handoff_offered`, v2 |
| 6 | Codex | `transfer_work accept` | `active`, v3 |
| 7 | Codex | code `removeTodo`, `finish_work review_ready` | v4 |
| 8 | Claude Code | revue → `update_work record finding` | Bug trouvé : ids dupliqués après suppression |
| 9 | Codex | `reopen`, correction (compteur `nextId`), `finish_work complete` | v6, 5/5 tests OK |
| 10 | Codex | nouveau `start_work` TODO-2 | Accepté, le fichier est libéré |

Le script qui rejoue chaque appel se trouve dans [scripts/concord-sim/](scripts/concord-sim/) :
`node scripts/concord-sim/call.mjs <kind> <session> <outil> <fichier.json>`.

## 1. Installation facile ou pas ?

**Oui, rapide** : `npm i -g` puis `concord setup` (3 secondes) suffisent. Les messages sont clairs
(« Restart your coding client… », rappel pour faire confiance aux hooks Codex).

Deux points m'ont surpris :
- `setup` a créé **19 fichiers** de config pour 10 outils (Cursor, Gemini, Grok, Devin, Qwen…) alors
  que je n'en utilise que deux. Le dépôt devient vite chargé.
- Malgré `--no-global`, il a écrit hors du dépôt : `~/.codex/config.toml` et
  `~/.copilot/copilot-instructions.md`.
- Sous Windows, le `.mcp.json` généré lance `concord-mcp` directement. Pour ma config utilisateur
  Claude Code, j'ai utilisé `cmd /c concord-mcp` (le lanceur npm est un `.cmd`).

## 2. Quel agent tu as utilisé avec Codex ?

**Claude Code**. Honnêtement : la CLI Codex n'était pas installée sur la machine, donc la session
« Codex » a été **simulée** en pilotant `concord-mcp` en JSON-RPC avec `CONCORD_AGENT_KIND=codex` et un
`agent_id` explicite, comme le font les hooks Codex (Codex vide l'environnement des serveurs MCP, voir
`dist/domain/identity.js`). La partie Concord est réelle (serveur, cloud, verrous, messages), mais
la partie Codex ne l'est pas. Prochaine étape : refaire le test avec la vraie CLI Codex.

## 3. Comment Concord détecte un conflit ?

Chaque agent déclare ses fichiers dans `start_work` (`expected_files`). En mode Concord Cloud, les
fichiers sont détenus **en exclusivité** : un second `start_work` sur un fichier déjà détenu est refusé
et le message indique la tâche et l'agent qui le détiennent. Le fichier est libéré quand la tâche est
terminée ou transférée. La détection se fait donc **avant** l'édition, sur la déclaration et non sur le diff.
Il existe aussi un hook optionnel `PreToolUse` (`concord setup --claude-hooks`) pour bloquer une édition
non déclarée.

## 4. Comment les agents communiquent ?

Avec `update_work` en `operation: prompt` ou `reply`, adressé à un `agent_id`, avec une
`idempotency_key`. Les messages sont mis en file et **récupérés par le destinataire** (pull) :
- les hooks du client (ou `concord inbox drain`) les récupèrent et les marquent « delivered » ;
- les reçus suivent les états sent → delivered → read → replied ;
- `inspect_work query` permet de chercher dans l'historique (messages, handoffs, findings). C'est très
  pratique comme journal de bord, mais la recherche est littérale (« duplicate ids » ne trouvait pas
  « reuse an id »).

## 5. Le workflow start → work → handoff → review est-il naturel ?

**Oui, dans l'ensemble.** Les 5 outils correspondent bien à la façon dont on travaille à deux, et le
`handoff` avec preuves (fichiers modifiés, tests passés, décisions, prochaines étapes) est le point fort :
l'agent suivant a tout le contexte. Le versionnage (`expected_version`) évite les écrasements.

Moins naturel :
- le **relecteur ne peut pas rouvrir** la tâche qu'il relit (« not this agent's to reopen ») : seul le
  propriétaire le peut. La boucle de revue demande donc un aller-retour de plus ;
- il faut suivre soi-même le numéro de version à chaque appel.

## 6. Quels problèmes j'ai rencontrés ?

1. **Impossible de répondre à un message lu** via `inspect_work` : « only a delivered message can be
   answered ». Il a fallu lancer `concord inbox drain` d'abord (normalement fait par les hooks, mais
   rien ne l'indique dans l'erreur).
2. **`update_work prompt` avec un `task_id` refusé** échoue (« Task "TODO-2" was not found ») alors que
   `task_id` est censé être un contexte facultatif. C'est justement le cas où l'on veut écrire à l'autre
   agent, juste après un refus de réservation.
3. **`concord handoff TODO-1`** plante avec une stack trace Node brute quand la machine est liée au
   cloud (« no local Concord store here »).
4. Un `fetch failed` ponctuel vers Concord Cloud (11 s), qui a fonctionné en relançant.
5. `inspect_work task_id=…` reste très succinct (« 1 update(s) ») : on ne voit pas le contenu des
   findings ni le dernier handoff.

## 7. Qu'est-ce que j'améliorerais ?

- Messages d'erreur qui disent quoi faire : « lancez `concord inbox drain` ou activez les hooks » ;
  « seul codex:7e2c51f1 peut rouvrir ; envoyez-lui un prompt ».
- `start_work` refusé → proposer directement un `prompt` au détenteur, avec le `task_id` toléré.
- Permettre au relecteur désigné (`needs_review_from`) de demander des changements / rouvrir.
- `inspect_work task_id` : afficher le dernier handoff et les findings en entier.
- `concord setup --only claude,codex` pour ne configurer que les outils utilisés, et respecter
  `--no-global` pour les fichiers hors dépôt.
- Commandes CLI (`handoff`, `review-packet`) qui marchent aussi en mode cloud, ou au moins un message
  propre sans stack trace.
