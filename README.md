
# Open Phage Data Sheet

Visit the site here: https://open.phage.directory

This project is a public-facing, collaborative Google Sheet project that collects information for phage academia, like tools, grants, and clinical trials. 

Collecting these links is currently user-generated, but once various resources are setup and listed (e.g. PubMed, clinicaltrials.gov) we can start automating the process.

The code in this repo is a simple backend and wrapper to pull data from the Google Sheet: https://docs.google.com/spreadsheets/d/1fhBigiisdCc8-YWD4K8U6yvXK47p67KzA7JfAWsh-Iw/edit#gid=818998992

Built with Hono (https://hono.dev/getting-started/cloudflare-workers) and deployed on Cloudflare Workers.

The Google Sheet "API" was made possible with [SpreadAPI](https://spreadapi.roombelt.com/setup), which is a free Google App Script that sets it up as a REST endpoint. This code uses Cloudflare Workers KV for caching.

## Sections & Schemas

We've added the following sections (these links go to the project page):

* [bioinformatics](https://open.phage.directory#bioinformatics)
* [clinical trials](https://open.phage.directory#clinical-trials)
* [events](https://open.phage.directory#events)
* [lab tools](https://open.phage.directory#lab-tools)
* [definitions](https://open.phage.directory#definitions)
* [grants](https://open.phage.directory#grants)
* [resources](https://open.phage.directory#resources)
* [funding opportunities](https://open.phage.directory#funding-opportunities)
* [contributors](https://open.phage.directory#contributors)

And here are the respective schemas (this is useful for automation in the future, esp. with something like Assistants)



### bioinformatics

This section details the bioinformatics data, which includes various tools and resources. Each entry in the data array contains details about a specific tool, including metadata like name, category, and modification time.

#### Data Schema Description

- `_id`: Unique identifier for the entry.
- `Last Modified`: Timestamp of the last update to this entry.
- `Name`: Name of the tool or resource.
- `Category`: Classification of the tool, such as 'Assembly Tool'.
- `Notes`: Additional details or description of the tool.
- `URL`: Web address where more information can be found.
- `Source`: Where the data or tool originates from.
- `Version`: The release version of the tool.
- `Developed By`: Who developed or maintains the tool.
- `License`: Licensing information for the tool.
- `Language/Framework`: Programming language or framework used.
- `Input Format`: Expected format for input data.
- `Output Format`: Format of the data after processing.
- `Date of Release`: When the tool was first released.



### clinical trials

This section includes data on clinical trials. Each entry holds information about individual clinical trials such as their ID, title, and current status.

#### Data Schema Description

- `_id`: Unique identifier for the clinical trial entry.
- `Last Modified`: Timestamp when the trial information was last updated.
- `Trial ID`: Identifier for the trial, often matching a registry like clinicaltrials.gov.
- `Title`: The official title of the clinical trial.
- `Sponsor`: Organization or company sponsoring the trial.
- `Status`: The current recruitment status of the trial.
- `Phase`: The phase of the clinical trial, indicating its stage in the development process.
- `Start Date`: Date when the trial began or is set to begin.
- `Completion Date`: Expected end date of the trial.
- `Condition`: The medical condition being studied or treated.
- `Intervention`: The type of treatment or intervention being tested.
- `Location`: Geographic location where the trial is being conducted.
- `URL`: Link to the trial's webpage for more details.



### events

This section provides information on different events relevant to bioinformatics. Each event has details like its name, cost, and type.

#### Data Schema Description

- `_id`: Unique identifier for the event entry.
- `Last Modified`: Timestamp of the last change to the event's information.
- `Name`: The name of the event.
- `Cost`: Whether the event is free or paid, and if paid, the cost.
- `Description`: A short summary of what the event is about.
- `Type`: Kind of event, such as meetups, conferences, or workshops.
- `Organizer`: Who is organizing the event.
- `Location`: Where the event takes place.
- `Date`: When the event is scheduled.
- `URL`: A link to find more information about the event.
- `Notes`: Additional remarks or information about the event.



### lab tools

This section lists lab tools with specifics on each tool, including the name, manufacturer, and cost.

#### Data Schema Description

- `_id`: Unique identifier for the lab tool entry.
- `Last Modified`: Timestamp for when the tool information was most recently updated.
- `Name`: The name of the lab tool.
- `Type`: The type or category of the tool.
- `Manufacturer`: Company that produced or supplies the tool.
- `Description`: A brief explanation or key features of the tool.
- `URL`: Web address where you can find more information about the tool.
- `Cost`: Price of the tool, if available.
- `Manuals`: Links to user manuals or guides for the tool.
- `Reviews/Comments`: User reviews or comments on the tool.



### definitions

This section includes a list of definitions for terms commonly used in the field. It provides a detailed explanation of each term along with its author and reference.

#### Data Schema Description

- `_id`: Unique identifier for the definition entry.
- `Last Modified`: Timestamp indicating when the definition was last updated.
- `Term`: The word or phrase being defined.
- `Definition`: The explanation of the term.
- `Author`: The person or entity that provided the definition.
- `Reference`: Source or citation where the definition can be verified.
- `Related Terms`: Other terms that are associated or similar to the term being defined.
- `Date Added`: When the term was added to the list.
- `Notes`: Any additional notes or comments about the term.



### grants

This section contains information on various grants available for research and development in the field. Each entry details the specifics of a grant, including its ID, title, and financial details.

#### Data Schema Description

- `_id`: Unique identifier for the grant entry.
- `Last Modified`: Timestamp of when the grant entry was last edited.
- `Grant ID`: The specific identification number or code for the grant.
- `Title`: The official title of the grant.
- `Agency`: The organization or agency offering the grant.
- `Status`: Current status of the grant, such as open or closed for applications.
- `Open Date`: The date when the grant application process starts.
- `Close Date`: The deadline for grant application submissions.
- `Topic Area`: The subject or field that the grant targets.
- `Eligibility`: Criteria that applicants must meet to apply for the grant.
- `Amount`: The financial sum of the grant.
- `URL`: A link to more information or the application for the grant.


### resources

This section highlights various resources available to researchers and practitioners in the field, such as databases, tools, and reference materials.

#### Data Schema Description

- `_id`: Unique identifier for the resource entry.
- `Last Modified`: Timestamp when the resource information was last updated.
- `Name`: The name of the resource.
- `Category`: The area or field the resource belongs to.
- `Notes`: Any important remarks or comments about the resource.
- `URL`: The direct link to the resource.
- `Source`: The origin or the reference link for the resource.



### funding opportunities

This section details available funding opportunities such as awards, scholarships, fellowships, studentships, and grants. Each listing provides essential information for potential applicants.

#### Data Schema Description

- `_id`: Unique identifier for the funding opportunity entry.
- `Last Modified`: Timestamp indicating the last update to the funding opportunity's details.
- `ID`: A unique identifier assigned to each funding opportunity.
- `Name`: The official title of the funding opportunity.
- `Type`: The category of financial support offered.
- `Provider`: The organization or entity offering the funding.
- `Deadline`: The submission deadline for applications.
- `Field/Area`: The specific field or research area the funding is intended for.
- `Eligibility`: The requirements applicants must fulfill to be considered.
- `Benefit`: The advantage for the recipient, such as money, tuition aid, or research support.
- `URL`: A link to more information or to apply for the funding opportunity.


### contributors

This section is for contributors that add items to the project. Anyone can volunteer!

#### Data Schema Description

- `_id`: Unique identifier for each volunteer.
- `Last Modified`: Timestamp when the volunteer information was last updated.
- `Name`: Full name of the volunteer.
- `Affiliation`: Organization(s) the volunteer is associated with.
- `Socials`: Links to the volunteer's social media profiles or personal websites.



## Installing

```
npm install
npm run dev
```

```
npm run deploy
```
