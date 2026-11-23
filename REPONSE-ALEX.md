Objet : Re: Votre candidature – mon test de Concord MCP

Bonjour Alex,

Merci pour votre message. J'ai pris le temps d'essayer Concord MCP sur un petit projet de test :
un module todo en Node sur lequel deux agents (Claude Code et une session Codex) travaillent en
même temps.

Ce que j'ai fait :
- installation avec npm i -g puis concord setup : opérationnel en quelques secondes ;
- Claude réserve src/todo.js, Codex essaie de réserver le même fichier : la réservation est refusée
  et le message indique qui détient le fichier ;
- les deux agents se mettent d'accord par message (prompt/reply), puis Claude passe la tâche à Codex
  avec un handoff qui liste les fichiers, les tests et les décisions ;
- pendant la revue, Claude trouve un vrai bug dans le code de Codex (ids dupliqués après une
  suppression) ; la tâche est rouverte, corrigée, puis clôturée, avec 5 tests sur 5 qui passent.

Une précision honnête : la CLI Codex n'était pas installée sur ma machine. J'ai donc simulé la
session Codex en appelant directement concord-mcp en JSON-RPC, avec l'identité qu'utilisent les
hooks Codex. Tout le reste (serveur, cloud, réservations, messages) était réel.

Ce qui m'a plu : le handoff avec preuves et la recherche dans l'historique, qui donne un journal
clair de qui a décidé quoi.

Points de friction relevés, au cas où ce serait utile :
1. On ne peut pas répondre à un message lu via inspect_work tant qu'il n'est pas « delivered » ;
   l'erreur ne dit pas qu'il faut lancer concord inbox drain.
2. Un prompt qui cite le task_id d'une réservation refusée échoue (« Task not found »), alors que
   c'est le moment où l'on veut justement écrire à l'autre agent.
3. Le relecteur ne peut pas rouvrir la tâche qu'il relit : seul son propriétaire le peut.
4. concord handoff affiche une stack trace brute quand la machine est liée à Concord Cloud.
5. concord setup crée 19 fichiers pour 10 outils, et écrit dans ~/.codex et ~/.copilot malgré
   --no-global.

Le projet, avec mes notes détaillées et le script qui rejoue chaque appel, est ici :
[lien GitHub à ajouter]

Je serais ravi d'en discuter, ou de proposer une PR sur l'un de ces points.

Bonne journée,
Paul
