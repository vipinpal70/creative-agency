These are few changes, before implementing explain what did you understand nd how you will implement it?

creativeos new changes

- New Rework tab in writer and designer workspace so copies and creatives with changes and feedback can displayed directly ...done

- schedule and publish/approved together and rejected individually in designer workspace

- add rework tag on copies with changes -> goes to rework tab

- In preview model under the client feedback: distinguish 3 categories: creative/copy/both - track accordingly which feedback client gives for to maintain the rework cycle

- Add proper filters and tabs in writer workspace just like designer workspace but keep it relevant. match the layout to the designer workspace.

- add a high priority button on copies and creative cards and show on tag on copies and add filter

- before Implementing create an plan what did you undestant, how will you implement and what is the correct apporach
- add a high priority button on copy and creative cards, if the it is true then show a tag "urgent" if flase show nothing. This can be done by any member of the agency. Please give your inputs that where we should give this option? Approval page and workspace both?

- during copy create and after

- done by creative lead, admin, designer , writers
- ⁠carousel arrows bug (not moving to the next copy) No issue
- ⁠add “both” option in feedback in case of feedback on both creative nd copy

When I click on request change, it only opens a text layout, But do not give any option copy/creative/both

Questions:

- adhoc preview and what else need to add
- does the hide button should show to the clients too?
-

- different db for users

What to implement/refactor

- Refactor the adhoc feature:
  - add it into writer's workspace into "add new" button
  - in the flyer modal, remove caption, publish time, and rename publish date to delivery date and add type: digital/printable.
  - The adhocs will not be shown in the calendar it will only have a normal approval cycle.
  - Add categories in adhoc: video, static/image, carousel, article and all the default categories exist in the social media calendar, but the it should not contain buckets

- in content preview modal when it is in internal feedback it should show internal feedback not client feedback. How will you implement this explain me.

- On date filter in approval, writer/designer workspace atleast show 1 month window, for eg: 14th sept - 14th oct

- in designer workspace, remove the reject tab completely and show the content change and rejected work under same rework tab

keep the filters same in all the tabs in writer workspace which is in calender tab

Before implementation create an implementation plan and and recommendation to keep the workflow consistent and structured

- Refactor the writer workspace and redesign it like designer workspace:
  - My calendar tab will be same
  - add In progress tab: all the copies that are in progress (draft status)
  - all other tabs will be same from designer workspace internal review, client review, approved, rework
  - make sure the strict flow rules, so writer can see only his copies progress and review in his workspace.

Explain me what you have understood and how you will implement it.

Please fix the adhoc structure

Create a new simple tab for adhoc like others, the user needs to select the target client and then category of adhoc.
There are some bugs in categories: 1. You have not added flyer category 2. type field is only applicable for category === flyer and flyer field dont have platform field 3. execept flyer, all other categories will be same as ssm copies, just they dont have buckets and other related fields to calendar because they are individual copies

    Bugs:
    - update the version on the card in approvals page (inside it is update v1.1 but outside it is showing same v1)
    - add a adhoc tab in approvals page
    - remove adhoc filter from content calendar page
    - remove tiktok from adhoc social platform
    - add an optional note field into every modal in adhoc

you can add adhoc tab where we have all, social media, paid media in approvals page

before implementing, create an implementation plan and structure of this request

## LLM related changes:

- Remove the regenerate option from write with ai, chat and feedback option so user can make changes in the existing copy content not regenerate. It should work like a req, response chat. so user can make changes on the existing copy content not regenerate.
-

•⁠ ⁠add custom context - like pdf, or text, image

•⁠ ⁠competitor: creative information, for example details on which content is doing well etc.

•⁠ ⁠ask ai: research/chat

•⁠ ⁠LLM insight: - add further fields researched below

•⁠ ⁠llm response format in creative copy should be like claude and chatgpt: spaces, paragraphs, bullet points

Before implementation, create an implementation plan and structure of this request, and explain what you understood?

- When doing client research allow user to add competitor information, pdfs, images, urls. And store into db as context into the client project collection.
- Show the extra content provide by the admin into client page "llm insight tab"
- and make it same so once a response generate admin can re research for better response and latest research result will be store into the llm insight tab.
