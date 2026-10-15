# Writing rules (ASD-STE100)

All documents in this repository use ASD-STE100 Simplified Technical English (STE).
This page gives the rules that we use. Use these rules when you change a document.
Use them also for UI text and for error messages.

## 1. Words

1. Use one word for one meaning. Do not use synonyms.
   - Use "balance". Do not use "funds left" or "money available".
   - Use "transaction". Do not use "entry" or "record".
   - Use "credit" for money that comes in. Use "debit" for money that goes out.
2. Use technical names as they are (for example `pnpm`, `Redux Toolkit`, `VoiceOver`).
3. Use technical verbs for software actions (for example "install", "build", "start", "stop", "run", "select").
4. Do not use "should", "would" or "could". Use "must" for a requirement. Use "can" for a possibility.
5. Do not use phrasal verbs (for example "set up", "find out"). Use a single verb ("prepare", "find").
6. Use articles ("a", "an", "the") before nouns.

## 2. Sentences

1. Write a maximum of 20 words in a procedural sentence.
2. Write a maximum of 25 words in a descriptive sentence.
3. Write one instruction in one sentence.
4. Use the active voice. Write "The server refuses the transaction". Do not write "The transaction is refused by the server".
   - Exception: a UI message can use a short passive form when the agent is not important ("Transaction recorded.").
5. Use the imperative in procedures ("Start the server.").
6. Put a condition before the instruction ("If the build fails, delete the `ios` folder.").

## 3. Paragraphs and procedures

1. Write a maximum of 6 sentences in a paragraph.
2. Write one topic in one paragraph.
3. Number the steps of a procedure.
4. Put a WARNING (risk to people or data) or a CAUTION (risk to equipment or software) before the step it applies to.

## 4. UI text and error messages

1. Tell the user what happened. Then tell the user what to do.
   - "The transaction is refused. The balance cannot go below $0.00. Available balance: $20.00."
   - "Enter a number with a maximum of 2 decimals, for example 12.50."
2. Do not blame the user. Do not use "invalid" alone. Tell the correct format.
3. Do not use color or an icon as the only way to give the meaning (WCAG 1.4.1).

## 5. Exceptions

Code, commands, file names, API field names and quoted standard titles stay in their original form.
Code comments use the same rules where possible.
