🏠 HOME DASHBOARD
Feature
Specifics
Welcome Header
"Welcome back, [Name]" with logo
Topic Cards
One card per active topic (Signals, Systems, Integration, C++)
Topic Status Indicator
Small colored dot + one-liner under each topic — "Needs review", "On track", "Inactive 6 days"


📚 TOPIC PAGE — Left Half (AI Chatbot)
Feature
Specifics
Context-Aware Opening
AI reads student state before saying anything — never opens with a blank prompt
AI Controls the Flow
Student cannot skip recap or jump ahead — AI decides what happens next
Inactivity Recap Mode
1-2 days inactive → quick quiz. 3-5 days → full concept recap + quiz. 7+ days → near-fresh start
Mistake-Aware Looping
If student has high error rate on a subtopic, AI loops back to it unprompted
Plateau Mode
If student is stuck after repeated attempts, AI switches explanation style — different analogy, visual description, simpler breakdown
Mastery-Paced Progression
Low mastery → AI slows down, more practice. High mastery → AI moves faster, harder problems
Concept Introduction
AI introduces new concepts only when it decides the student is ready
Practice Questions
AI generates questions on the fly based on current weak spots


📚 TOPIC PAGE — Right Half (Metrics Panel)
Feature
Specifics
Subtopic Mastery Breakdown
Not just one number — broken down per subtopic so student sees exactly where the gap is
Weak Spots Panel
Lists specific subtopics the student consistently gets wrong — with a label like "Needs work"
Last Studied
"Last studied X days ago" — forward framing, not a guilt trip
Today's Focus
One AI-generated sentence at the top — "Focus on: Laplace Transform basics — 20 mins"
Session Streak
How many consecutive days they've studied this topic
Concepts Covered vs Remaining
Visual progress — X out of Y concepts done


🤖 AI BEHAVIOR LOGIC (Behind the Scenes)
Trigger
AI Response
Student opens topic
AI silently reads: days inactive, last concept, mastery score, mistake patterns, streak
1-2 days inactive
Opens with quick recap quiz before continuing
3-5 days inactive
Full concept recap + comprehension check before moving forward
7+ days inactive
Near-fresh start — re-explains fundamentals of topic
Weak spot detected
Loops back to that subtopic unprompted
Student stuck after 3 attempts
Switches explanation style — different approach, not same thing repeated
High mastery
Speeds up, introduces harder problems, skips over basics
Low mastery
Slows down, more practice questions, doesn't push to next concept
Concept mastered
AI decides to move forward — introduces next concept


📦 DATA TRACKED PER STUDENT
Data Point
Why It's Tracked
Last session timestamp per topic
Drives inactivity logic
Last concept covered per topic
AI knows where to resume or recap from
Mastery score per subtopic
Drives pacing and weak spot detection
Mistake history per subtopic
Drives looping and weak spot panel
Session streak per topic
Shown in metrics, influences AI tone
Number of attempts per concept
Triggers plateau mode after 3 failed attempts
Concepts completed vs total
Shown in metrics panel




