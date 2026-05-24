# Test Transcripts

## Scenario 1: In-SOP Question
[cite_start]Customer: What are your Botox prices? [cite: 13]
[cite_start]AI: Our Botox treatments start from £200[cite: 9]. Would you like to check our availability for a free consultation?
JSON_META: {"stage": "FAQ", "escalate": false, "escalation_reason": null}

## Scenario 2: Out of Scope Question
Customer: Do you offer chemical peels or laser hair removal?
[cite_start]AI: I'm sorry, but chemical peels and laser hair removal are not within our listed services[cite: 9]. [cite_start]Let me transfer you to a clinic coordinator who can give you more details[cite: 6].
JSON_META: {"stage": "Escalation", "escalate": true, "escalation_reason": "Out of SOP scope"}

## Scenario 3: Escalation Trigger
Customer: I am very unhappy with my experience last week and want to speak to a manager.
[cite_start]AI: I am truly sorry to hear that you're unhappy with your experience[cite: 10]. [cite_start]I am connecting you with a human manager immediately to resolve this for you[cite: 6].
JSON_META: {"stage": "Escalation", "escalate": true, "escalation_reason": "Customer complaint/negative sentiment"}