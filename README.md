# Zero Company Bond XP Tracker

A lightweight, in-browser mission checklist for tracking Bond XP opportunities for each selected Operator pair.

## Use

1. Select 2–4 Operators, or add a custom Operator.
2. Start a mission to generate one checklist for each unique pair.
3. Check Assist interactions (+10 XP) and other positive/support actions (+4 XP) as they happen.
4. Track all uses cumulatively for the mission. Uncheck an item to correct a mistake.
5. Start a new mission to clear interaction progress while keeping the selected Operators.

Each pair can track up to 2 Assists and 5 other actions (40 XP total). Mission progress is kept in session storage for the current tab session and is cleared when that session ends. It is not saved persistently or sent to a server.

## Development

This project uses Create React App.

```sh
npm install
npm start
```

Run the unit and UI tests:

```sh
npm test -- --watchAll=false
```

Create a production build:

```sh
npm run build
```
