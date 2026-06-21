# **Chapter 5**

---

This chapter provides a comprehensive overview of the Nibras platform's system implementation, detailing the development environment, project structure, frontend implementations, integration strategies, validation and testing procedures, and deployment methodologies. The aim is to provide a clear and in-depth understanding of the technical foundation and architectural decisions that underpin the Nibras educational platform.

## **5.1 Development Environment Setup**

To ensure a robust, efficient, and scalable development process, a carefully curated set of tools and technologies was selected for the Nibras platform. This environment was designed to support a comprehensive educational web application, leveraging modern, performant technologies that work in concert to deliver a seamless user experience.

## **Tools and Technologies Used:**

* ### **Frontend Web: [React.js](http://React.js)**

  *    **Explanation:** React.js is a popular open-source JavaScript library for building user interfaces, particularly single-page applications. Its component-based architecture promotes the creation of reusable and encapsulated UI elements, making it easier to develop complex and interactive interfaces. The virtual DOM ensures efficient rendering by minimizing direct manipulations, which improves performance in dynamic, data-driven applications. React's ecosystem, including state management solutions and robust developer tools, facilitates scalable and maintainable frontend development.  
* Frontend Web: Font Awesome 6 and CSS Styling  
  *    **Explanation:** Font Awesome 6 is utilized as the icon library across the entire platform. Its comprehensive set of vector icons provides consistent visual indicators for navigation, actions, and status updates throughout the dashboard, community pages, courses, and administrative panels. Google Fonts (Inter) is employed as the primary typeface for its clean, modern appearance and excellent readability across different screen sizes and devices.  
  * **Explanation:** For styling, the platform relies on CSS Custom Properties to implement a dynamic light and dark theme system. The theme is toggled via a data-theme attribute on the \<html\> element and persisted in localStorage for user preference retention across sessions. This approach avoids the overhead of a CSS framework while providing full control over the visual design.

    

    

    

* ###  **Backend: Node.js 20+ with NestJS 11 (Clean Modular Architecture)**

  *  **Explanation:**

    The backend of Nibras was developed using Node.js 20+, a high-performance JavaScript runtime built on Chrome's V8 engine. Node.js employs an event-driven, non-blocking I/O model, making it well-suited for handling concurrent requests efficiently. The application is built with NestJS 11, a progressive framework that provides a modular architecture, dependency injection, decorators, and strong support for REST APIs and WebSockets. This architecture promotes separation of concerns, improves maintainability, simplifies testing, and allows the system to scale as new features are added.

 

*  **Database: MongoDB 7 with Mongoose**  
  *  Explanation:

    MongoDB 7 was selected as the primary database because of its flexible document-oriented data model. Unlike relational databases, MongoDB stores data in BSON documents, making it suitable for managing diverse educational content such as courses, quizzes, coding problems, and student progress. Mongoose serves as the Object Data Modeling (ODM) library, providing schema validation, data modeling, and an intuitive interface for interacting with MongoDB while maintaining data consistency.

*  **Caching System: Redis 7**  
  * Explanation:

    Redis 7 is used as an in-memory data store to improve system performance and responsiveness. It caches frequently accessed data, manages user sessions, supports rate limiting, and stores real-time contest rankings using sorted sets. By reducing repeated database queries, Redis significantly decreases response times and improves scalability under high user loads.

   

*  **Version Control and Continuous Integration**  
  *  Explanation:

    Source code is managed using GitHub, which provides version control, collaboration, and change tracking throughout the development process. GitHub Actions is used to implement Continuous Integration and Continuous Deployment (CI/CD) workflows, automatically building, testing, and deploying the application whenever changes are pushed to the repository. This automation improves software quality and streamlines the development lifecycle.

AI Microservice

A dedicated Python microservice was developed using Flask to serve as the recommendation engine of the Nibras platform. Instead of embedding recommendation logic within the main backend application, all machine learning inference, feature engineering, capability mapping, and AI-powered community scoring functionalities were isolated into a lightweight service that communicates with the platform through HTTP APIs.

The microservice integrates two complementary intelligence layers:

* **XGBoost Classifier:** Responsible for generating probability-ranked specialization track recommendations based on a student's capability vector.  
* **GPT-4o-mini:** Used for supplementary AI tasks, including dynamic course weight generation for previously unseen courses and community comment scoring for recommendation reranking.

XGBoost was selected due to its strong performance on tabular classification problems, efficient multi-class probability prediction, and low inference latency suitable for real-time recommendation systems. GPT-4o-mini was chosen for its reliable instruction-following capabilities, structured JSON generation, and cost-efficient inference compared to larger language models.

The microservice provides four primary functionalities, each exposed through a dedicated REST API endpoint.

---

1\. Track Recommendation (/api/recommend)

This endpoint represents the core intelligence of the Nibras recommendation system. Student academic grades or pre-computed capability scores are submitted and processed through a multi-stage pipeline consisting of:

1. Grade-to-capability mapping.  
2. Construction of a 28-dimensional feature vector.  
3. XGBoost model inference.  
4. Cosine similarity computation.  
5. Weighted dot-product fit scoring.  
6. Deterministic local Explainable AI (XAI) generation.  
7. Optional community-based reranking.

The endpoint returns the top three recommended Computer Science specialization tracks. For each recommendation, the response includes:

* Model probability score.  
* Cosine similarity score.  
* Weighted fit score.  
* Structured explanation containing:  
  * Strongest student capabilities.  
  * Most influential courses.  
  * Capability-by-capability fit assessment against the selected track profile.

---

2\. Dynamic Course Weight Generation (/api/courses/add)

When a course submitted in a recommendation request is not found in the local course\_weights.json knowledge base, this endpoint is invoked.

The endpoint receives the course name and uses GPT-4o-mini to generate a capability-weight distribution representing the relationship between the course and the platform's capability framework. The generated weights are normalized to ensure their sum equals exactly **1.0**.

Once generated, the new course profile is:

* Persisted to course\_weights.json.  
* Loaded into the in-memory cache.

This enables immediate availability for future recommendation requests without requiring a service restart.

---

3\. Course Catalogue Listing (/api/courses)

This utility endpoint provides the complete list of courses currently stored within the course\_weights.json knowledge base.

Its primary purpose is to allow frontend applications to display supported courses and validate user inputs during recommendation requests.

---

4\. Community Comment Scoring (Integrated within /api/recommend)

This optional recommendation enhancement mechanism is activated when a request contains a top\_comment field representing a student's self-description or community-generated content.

GPT-4o-mini evaluates the submitted text against all twelve capability dimensions using soft scoring. The resulting capability scores are then combined with the model-generated recommendation probabilities using a blending weight of **0.1**.

This reranking process allows recommendation results to incorporate not only academic performance but also the student's expressed interests, preferences, and professional aspirations, producing more personalized specialization recommendations

AI Chatbot Microservice

A dedicated Python microservice was developed using Flask to serve as the conversational intelligence engine of the Nibras platform. Instead of embedding AI functionality directly within the main backend application, all natural language processing, semantic search, question classification, and educational assistance capabilities were isolated into a lightweight service that communicates with the platform through HTTP APIs.

The microservice integrates with OpenAI's API using two specialized models:

* **GPT-4o-mini:** Responsible for natural language understanding, question classification, answer generation, learning analytics, and structured JSON responses.  
* **text-embedding-3-small:** Responsible for generating semantic embeddings used in community question matching and similarity computation.

GPT-4o-mini was selected due to its strong contextual reasoning capabilities, support for structured JSON output, low response latency, and cost efficiency, making it suitable for a real-time educational assistant serving large numbers of students concurrently. text-embedding-3-small was chosen for its high-quality dense vector representations, compact embedding size, and low operational cost, enabling efficient semantic search across the platform's community knowledge base.

The microservice provides five primary AI-powered functionalities, each exposed through a dedicated REST API endpoint.

---

**1\. Question Classification and Answer Generation (/api/ask)**

This endpoint represents the core intelligence of the Nibras AI assistant. Every student question is processed through a two-stage pipeline.

During the first stage, GPT-4o-mini:

1. Classifies the question across seventeen Computer Science knowledge domains.  
2. Assigns one or more topic tags from a controlled vocabulary of twenty-four categories.  
3. Generates a complete student-friendly answer.  
4. Produces three progressively revealing learning hints.  
5. Returns a structured JSON response containing an Explainable AI (XAI) component.

The XAI block includes:

* The reasoning behind the generated answer.  
* Core Computer Science concepts involved.  
* Potentially unfamiliar technical terms requiring additional explanation.

During the second stage, a deterministic tag-correction mechanism validates the generated tags against a curated keyword-to-tag mapping containing more than 1,400 Computer Science terms. Word-boundary regular expression matching is used to override or supplement AI-generated classifications with high-precision rule-based labels when necessary.

---

**2\. Community Semantic Matching (Integrated within /api/ask)**

After question classification, the corrected tags are used to perform semantic retrieval against the Nibras community Question-and-Answer repository.

For each of the top three assigned tags:

1. Relevant community questions are retrieved from the platform backend.  
2. Semantic embeddings are generated using text-embedding-3-small.  
3. Cosine similarity is computed using:  
   * Question title embeddings.  
   * Combined title-and-body embeddings.  
4. The higher similarity score is selected as the base matching score.

To improve retrieval quality, a Jaccard keyword-overlap bonus of up to **0.20** is applied after stopword removal and title normalization.

If the highest resulting score exceeds the configured threshold of **0.55**, the system returns the matched community discussion instead of a fully generated response, allowing students to benefit from existing peer-reviewed knowledge and discussions.

---

**3\. XAI Term Explanation (/api/explain)**

This endpoint supports contextual learning by providing explanations for technical terms encountered within AI-generated responses.

The endpoint accepts:

* The target term.  
* Its surrounding textual context.

GPT-4o-mini then generates a structured JSON response containing:

* A beginner-friendly definition.  
* A practical example or code snippet.  
* Related Computer Science concepts.

This functionality allows students to explore unfamiliar terminology without leaving the learning environment.

---

**4\. Learning Insights Analysis (/api/insights)**

This endpoint generates personalized learning analytics based on a student's historical platform activity.

The input consists of statistical summaries including:

* Question frequency.  
* Topic distribution.  
* Activity streaks.  
* Learning engagement metrics.

GPT-4o-mini analyzes this information and produces a structured learning assessment that identifies:

* Demonstrated strengths.  
* Underrepresented or neglected Computer Science topics.  
* Recommended areas for improvement.  
* Three specific actionable next steps.

The resulting JSON output is rendered within the student's personalized Insights Dashboard.

**5\. Personalized Study Path Generation (/api/routing)**

This endpoint generates individualized learning roadmaps based on a student's desired learning objective.

Given a target topic or career goal, GPT-4o-mini constructs a sequenced study plan consisting of four to eight learning stages ordered according to prerequisite dependencies.

Each generated step includes:

* Step title.  
* Learning description.  
* Estimated study duration (in minutes).  
* Associated Computer Science topics.  
* Readiness status indicating whether the step can be started immediately or requires completion of earlier stages.

This functionality enables students to follow structured, dependency-aware learning pathways tailored to their goals and current knowledge level.

---

 

## **5.2 Project Structure**

The Nibras project is meticulously structured to promote modularity and maintainability. This organized approach ensures a clear separation of concerns, making the system easier to develop, test, and scale.

### **5.2.1 Frontend Structure:**

The Nibras frontend is architected as a Multi-Page Application, with the project organized under the client/ directory where each major feature resides in its own subdirectory. This structure promotes modularity and allows team members to work on different features and services independently. Those services and features include:

* **Login** — Authentication pages including email/password login, signup with OTP verification, Google and Microsoft OAuth callbacks, and password reset flows.  
* **Dashboard** — Student , instructor and admin dashboards displaying course progress, milestones, study streaks, GPA calculations, and gamification badges.  
* **Courses** — Course catalog, enrollment, grades, assignments, projects, and video content.  
* **Community** — A full Q\&A platform with questions feed, answer posting, voting system, tag filtering, and mentorship features.  
* **Competitions** — Coding contests, practice problems, team management, and ranking boards.  
* **Ai-tutor** — AI-powered tutoring interface, learning insights, and smart course recommendations.  
* **Admin** — Comprehensive administrative panel for course management, user administration, role management, grading, moderation, and system configuration.  
* **Analytics** — Data visualization dashboards for overview metrics, course analytics, and student engagement tracking.  
* **Achievements** — Gamification features including badges, leaderboards, and reputation tracking.  
* **Settings** — User profile and preference management.  
* **Projects** — Project catalog, planning tools, and instructor project oversight.

Each feature directory follows a consistent pattern containing an HTML file for structure, a JavaScript file for logic and API interaction, and a CSS file for presentation, all loaded independently by the browser.

### **5.2.2 Backend Structure (NestJS Modular Architecture)**

The backend of Nibras follows a modular architecture provided by NestJS, which separates application responsibilities into independent, reusable modules. This design improves maintainability, scalability, and testability while promoting a clear separation of concerns. The key architectural layers include:

* **Controllers:** Controllers serve as the entry points for all incoming HTTP requests from the web client. They define RESTful API endpoints, validate incoming requests, and delegate processing to the appropriate service layer before returning formatted HTTP responses. Each feature is encapsulated within its own controller, such as authentication, user management, competitions, courses, community, assessments, gamification, and health monitoring.  
* **Services:** The service layer contains the core business logic of the application. It implements functionalities such as user authentication and session management, synchronization of programming contests from multiple competitive programming platforms, ELO rating calculations, Docker-based code execution orchestration, badge and achievement evaluation, plagiarism detection, and course progress tracking. By isolating business rules from the presentation layer, services remain reusable and easier to maintain.  
* **Schemas (Models):** Data structures are defined using Mongoose schemas, which specify the structure and validation rules for documents stored in MongoDB collections. These schemas represent the application's core entities, including users, courses, competitions, assessments, submissions, badges, and community posts. They ensure data consistency while leveraging MongoDB's flexible document-oriented model.  
* **Modules:** The application is organized into independent feature modules, each encapsulating its controllers, services, and database schemas. Core modules include Authentication, Users, Role-Based Access Control (RBAC), Competitions, Courses, Course Content, Assessments, Community, Gamification, Testing, and Health Monitoring. Shared modules such as Database, Configuration, and Redis provide common services that can be reused across the entire application.  
* **Gateways:** NestJS WebSocket Gateways provide real-time communication between the server and connected clients using Socket.IO. They are used to broadcast live contest standings, leaderboard updates, and community events without requiring clients to repeatedly poll the server, resulting in a more responsive user experience.  
* **Guards and Middleware:** Guards and middleware provide cross-cutting functionality throughout the application. Authentication is enforced using a Session Authentication Guard, while authorization is handled through Role-Based Access Control (RBAC) and permission guards to restrict access according to user roles. Global validation ensures incoming requests satisfy predefined data constraints before reaching the business logic, while middleware is responsible for tasks such as request logging, session handling, and centralized exception management.  
* **Shared Configuration:** The project uses TypeScript path aliases (e.g., `@modules`, `@common`, `@config`, and `@database`) to simplify imports and improve code organization. This reduces dependency complexity and makes the project structure easier to navigate and maintain.

### **5.2.3 AI Microservice Structure (Python / Flask)**

**AI Microservice Structure – Recommendation Microservice (Python / Flask)**

The Recommendation Microservice follows a modular architecture based on the principle of separation of concerns, where each module is responsible for a specific stage of the recommendation pipeline including data loading, capability mapping, model inference, AI scoring, and API routing.

---

**app.py – Application Entry Point**

This module serves as the entry point of the recommendation service. It loads environment variables from the .env file, configures structured logging, initializes the Flask application, enables Cross-Origin Resource Sharing (CORS), and registers the recommendation Blueprint under the /api URL prefix.

Additionally, the module exposes two infrastructure endpoints:

* / for basic service availability verification.  
* /health for health monitoring and deployment diagnostics.

The application supports runtime configuration via environment variables: FLASK\_DEBUG controls debug mode (defaults to false), and PORT controls the listening port (defaults to 5000).

**config.py – System Configuration Layer**

This module acts as the centralized configuration repository for all recommendation-related constants.

It defines:

* The canonical list of twelve capabilities (CAPABILITIES).  
* Capability column identifiers (CAPS).  
* The training target column (TARGET\_COL).  
* The TRACK\_PROFILES dictionary describing capability requirements for each of the eight Computer Science specialization tracks.

To improve runtime efficiency, the module precomputes track capability vectors (TRACK\_VECS) during initialization. The helper function profile\_to\_vec() ensures consistent mapping between capability profiles and the predefined capability ordering used throughout the recommendation pipeline.

---

**inference.py – Recommendation Inference Engine**

This module contains the core recommendation logic and a comprehensive local Explainable AI (XAI) system.

During startup, it loads the trained machine learning artifacts:

* model.pkl (XGBoost classifier)  
* label\_encoder.pkl (track label decoder)

using Joblib. Missing artifacts trigger descriptive runtime exceptions to prevent invalid deployments.

Core Pipeline

The module implements the complete recommend() pipeline, which performs:

* Input validation.  
* Twenty-eight-dimensional feature vector construction.  
* XGBoost probability inference.  
* Cosine similarity computation.  
* Weighted dot-product scoring.  
* Deterministic local XAI generation per recommended track.

**Soft Voting**

soft\_vote() blends ML and LLM scores into a final ranking. When the LLM score for a track is zero, a penalty is applied (ML score × 0.6 instead of the full weighted average), and tracks with a final score below 0.05 are filtered out.

**XAI System**

The module exposes a multi-layer explanation system:

| Function | Purpose |
| ----- | ----- |
| explain\_recommendation() | Per-track explanation: top capabilities, top contributing courses, and track fit analysis |
| \_explain\_rejection() | Explains why a non-selected track was ranked lower, citing ML probability, LLM assessment, and capability gaps |
| \_explain\_llm\_influence() | Compares ML ranking vs. final ranking to identify which tracks were promoted or demoted by the LLM signal |
| \_explain\_confidence() | Assigns a High / Moderate / Low confidence level based on agreement between ML and LLM signals |
| \_explain\_feature\_importance() | Ranks the student's top capabilities by impact and assesses overall profile strength |
| explain\_full\_recommendation() | Aggregates all of the above into a single structured explanation object |

The module also retains rerank\_with\_community() for backward compatibility, which blends recommendation probabilities with community-derived capability signals.

---

**mapper.py – Grade-to-Capability Mapping Layer**

This module transforms raw academic grades into the platform's capability representation.

At startup, course\_weights.json is loaded into memory as COURSE\_CAPABILITY\_WEIGHTS, eliminating repeated disk access during request processing.

The grades\_to\_capabilities() function:

* Normalizes course grades to the range \[0, 1\].  
* Retrieves capability weights for each course.  
* Applies weighted capability contributions.  
* Produces a normalized twelve-dimensional capability vector.

Courses that are not found in the knowledge base are collected and returned as warnings within the API response.

The module also implements add\_course\_to\_weights(), which supports dynamic course registration by invoking GPT-4o-mini to generate capability distributions, normalizing the generated weights, persisting them to disk, and updating the in-memory cache without requiring a service restart.

---

**llm\_scorer.py – Multi-Signal LLM Analysis Module**

This module was significantly expanded and now acts as the primary LLM intelligence layer of the system, providing four independent scoring signals and an aggregate scorer.

The module initializes the OpenAI client using the OPENAI\_API\_KEY environment variable. It also defines two reference tables used for structured signal mapping:

* PROBLEM\_TYPE\_TRACK\_MAP — maps 36 standard problem types (e.g., Dynamic Programming, Graph Algorithms, Circuit Design) to their associated CS tracks with weighted relevance scores.  
* PLATFORM\_TAG\_MAP — converts raw tags from competitive programming platforms (Codeforces, LeetCode) and security platforms (TryHackMe, CTF) into standard problem types for normalization before scoring.

**The Four LLM Scoring Functions**

1\. get\_community\_scores(top\_comment, recommended\_tracks) Scores a student's free-text community comment against each CS track (0.0–1.0). When recommended tracks are already available, the model is instructed to zero-out scores for tracks clearly unrelated to the candidate set, reducing noise from generic comments.

2\. get\_quiz\_scores(correct\_answers) Performs NLU on a student's correct quiz answers. The LLM first identifies the CS concepts demonstrated by each answer, then maps those concepts to track relevance scores. Capped at 20 answers per call.

3\. get\_problem\_solving\_scores(problem\_type\_ranks) Converts competitive programming or CTF activity into track scores. Raw platform tags are first normalized via normalize\_problem\_tags() using PLATFORM\_TAG\_MAP, then counts are converted to proportions. The LLM is provided the full PROBLEM\_TYPE\_TRACK\_MAP as a reference and asked to compute a weighted sum per track. Unknown tags not in the reference are passed to the LLM for inference by name.

4\. get\_grades\_scores(grades, other\_signals\_summary) Interprets grades not as raw numbers to multiply, but as an academic pattern. The LLM receives each course with its capability focus areas (from course\_weights.json) and reasons about the overall combination rather than scoring courses in isolation. An optional other\_signals\_summary string provides context from other signals (comment, quiz, problem-solving) to help the LLM resolve ambiguity.

**Aggregate Scorer**

get\_llm\_track\_scores() combines all four signals via a weighted average:

| Signal | Default Weight |
| :---- | :---- |
| Quiz answers | 0.25 |
| Community comment | 0.25 |
| Grades context | 0.25 |
| Problem solving | 0.25 |

Only signals that are actually provided are included; weights are renormalized automatically over the available signals.

**Student-Facing XAI**

explain\_recommendation\_to\_student() generates a personalized, student-readable explanation for the top recommended track. It references actual courses, quiz answers, and problem types, and covers six dimensions: overall summary, grades signal, comment signal, quiz signal, competitive programming signal, and confidence level. Falls back to generic text if the API call fails.

---

**routes.py – API Routing Layer**

This module defines all public API endpoints and coordinates the complete request lifecycle.

**POST /api/recommend**

All four input signals are now required:

* grades — {course: grade (0–100)}  
* top\_comment — free-text community comment string  
* correct\_answers — list of correct quiz answer strings  
* problem\_type\_ranks — {problem\_type\_or\_tag: count} (raw platform tags supported)

The endpoint executes the following pipeline:

1. Validation — checks for all four required fields and validates grade ranges.  
2. Capability extraction — converts grades to a capability vector via grades\_to\_capabilities(), or accepts a pre-computed capabilities dict.  
3. ML recommendation — runs recommend() to get XGBoost probabilities and per-track explanations.  
4. LLM signal collection — calls get\_llm\_track\_scores() with all four signals; grades are always passed for contextual interpretation.  
5. Soft voting — blends ML and LLM scores via soft\_vote() with ml\_weight \= 0.40 (LLM carries 60% weight, reflecting that ML is trained on synthetic data).  
6. LLM-promoted tracks — tracks that were not in the ML top-k but were promoted by LLM have their stats (similarity, weighted\_fit) computed on the fly.  
7. Fit health check — each final recommendation is checked for capability gaps; tracks with key weak capabilities receive a fit\_warning field in the response.  
8. Student XAI — explain\_recommendation\_to\_student() is called for the top recommendation.  
9. Response construction — builds the structured response including top\_recommendation, recommendations, meta, insights, and optionally llm\_track\_scores and warnings.

The response meta block reports the scoring method used (soft\_voting or ml\_only), the ML/LLM weight split, and which LLM signals were included.

**GET /api/courses**

Returns a list of all known course identifiers from course\_weights.json.

**POST /api/courses/add**

Dynamically registers a new course by generating its capability weights via GPT-4o-mini, persisting them to course\_weights.json, and updating the in-memory cache. Requires OPENAI\_API\_KEY to be set on the server.

**course\_weights.json – Course Knowledge Base**

This file serves as the editable knowledge repository connecting academic courses with capability distributions. Each entry maps a normalized course identifier to a weighted capability profile whose values collectively sum to 1.0.

The current repository contains twenty-one courses spanning Mathematics, Physics, Biology, Engineering, and core Computer Science subjects including CS103, CS106A/B/X, CS107, CS109, CS110, and CS161.

The knowledge base can be extended either manually or through the /api/courses/add endpoint without requiring application redeployment.

---

**model.pkl and label\_encoder.pkl – Machine Learning Artifacts**

These serialized artifacts are generated during the offline model training process.

* model.pkl stores the trained XGBoost multi-class classification model.  
* label\_encoder.pkl stores the Scikit-learn LabelEncoder used to map model output indices to specialization track names.

Both artifacts are loaded once during service startup and remain available throughout the application's lifetime.

**AI Microservice Structure – AI Chatbot Microservice (Python / Flask)**

The AI Chatbot Microservice adopts a lightweight Flask-based architecture where conversational intelligence, semantic retrieval, and educational assistance functionalities are centralized within a single application while maintaining clear logical separation between components.

---

**app.py – Core Application Module**

This module contains the primary Flask application and all endpoint definitions.

It exposes eight API endpoints:

* /api/ask  
* /api/explain  
* /api/insights  
* /api/routing  
* /api/answer-question  
* /api/generate-for-matched  
* /api/community  
* /api/stats

In addition, it hosts all shared utilities, embedding management functionality, semantic retrieval logic, and Railway integration helpers.

---

**TAG\_CORRECTION\_MAP – Controlled Tag Classification Knowledge Base**

This component consists of a curated dictionary mapping twenty-four Computer Science topic categories to more than 1,400 associated keywords.

Supported domains include:

* Algorithms  
* Data Structures  
* Operating Systems  
* Computer Networks  
* Security  
* Databases  
* Artificial Intelligence  
* Machine Learning  
* Software Engineering  
* Cloud Computing  
* DevOps  
* Distributed Systems  
* Compiler Design  
* Theory of Computation  
* Programming Languages  
* Computer Architecture  
* Mathematics  
* Linear Algebra

and additional specialized areas.

The mapping forms the foundation of the deterministic tag correction layer used to improve classification precision.

---

**AMBIGUOUS\_KEYWORDS – Ambiguity Resolution Layer**

This component contains keywords that may appear in both technical and non-technical contexts.

Examples include:

* Tree  
* Stack  
* Kill  
* Monitor  
* Frame  
* Kernel

These terms only contribute to tag assignment when additional Computer Science context is detected, reducing false-positive classifications caused by ordinary language usage.

correct\_tags() – Rule-Based Tag Correction Engine

This function performs deterministic tag refinement after AI classification.

Using word-boundary regular expression matching, it identifies domain-specific terminology and supplements or overrides model-generated tags when necessary.

The function also removes overly generic classifications when more specialized tags are detected and returns a deduplicated, alphabetically sorted tag list.

**SQLite Embedding Cache**

The chatbot maintains a local SQLite database (embeddings\_cache.db) for storing semantic embeddings.

Embeddings are indexed using:

* Question identifiers.  
* MD5 content hashes.

The cache subsystem includes:

* cache\_get()  
* cache\_set()  
* cache\_cleanup()

which collectively provide efficient storage, retrieval, and maintenance of embedding data while removing obsolete entries and limiting cache growth.

This significantly reduces OpenAI API usage, latency, and operational cost.

---

**Railway Integration Layer**

The Railway integration layer manages all communication with the Nibras community backend.

Key functions include:

* fetch\_questions()  
* fetch\_questions\_by\_tag()  
* fetch\_community\_answers()  
* post\_answer\_to\_railway()

The system supports full pagination, response normalization, in-memory caching, and standardized internal data representation through \_parse\_questions().

**Query Expansion Engine (expand\_query())**

This component improves retrieval quality by reformulating short or Arabic-language queries into complete English Computer Science questions before embedding generation.

The normalization process substantially improves semantic similarity matching against the English-language community knowledge base.

---

**Semantic Retrieval Engine (\_semantic\_match())**

This module implements hybrid semantic matching using cosine similarity and keyword-overlap scoring.

For each candidate question, similarity is calculated using:

* Title embeddings.  
* Combined title-and-body embeddings.

The higher score is selected and augmented using a Jaccard keyword-overlap bonus before ranking candidate matches.

---

**Unified Answer Generation Engine (generate\_ai\_answer())**

This component orchestrates all AI-generated responses.

It constructs the complete conversation context, enforces structured JSON output from GPT-4o-mini, validates returned fields, and applies override rules for borderline Computer Science questions when required.

The generated response includes:

* Answer content.  
* Topic tags.  
* Progressive hints.  
* Explainability information.  
* Supporting concepts.

**SYSTEM\_PROMPT – Centralized Prompt Definition**

The system prompt defines the operational behavior of the chatbot and serves as the single source of truth for:

* Supported Computer Science domains.  
* Topic taxonomy.  
* Refusal policies.  
* Response style guidelines.  
* JSON response schema.  
* Explainable AI requirements.

## **5.3 Frontend Implementation**

* The frontend of Nibras was developed using **React**, a powerful JavaScript library for building dynamic and responsive user interfaces.When a page initializes, it sequentially loads the configuration module, shared utility functions, and the centralized API service layer, ensuring each is loaded exactly once with cache-busting for development.


* **Authentication:** it is implemented across multiple entry points. The login page supports email and password authentication with OTP verification for newly registered accounts, Google OAuth through a redirect-based implicit grant flow, and Microsoft OAuth through the same pattern. On successful authentication, tokens are persisted in localStorage and the user is redirected based on their role — students to the student dashboard, instructors to the instructor dashboard, and administrators to the admin panel. An auth guard script included on every protected page performs a synchronous token existence check followed by an asynchronous background validation against the user profile endpoint, displaying an access-denied overlay for unauthorized role attempts.


* The application is structured around key pages: **Dashboard**, **Courses**,**Competitions**, **Achievements**, **community** and **AI-tutor**.


* **Themes**: The theming system uses CSS custom properties defined under light and dark selectors. On page load, a small inline script reads the user's saved preference from localStorage and applies the correct theme before rendering, eliminating flash of unstyled content. Theme changes are persisted immediately and reflected across all pages with smooth transitions.


* **Real-time Community Platform**: The Community section is designed for collaborative learning and knowledge sharing, offering a comprehensive set of features for peer-to-peer interaction powered by real-time WebSocket communication:  
  *  **Questions & Answers Feed**: A paginated feed displaying community questions with full-text search, tag-based filtering, course-based filtering, and four sort modes — Recent, Popular, Unanswered, and My Questions. Each question card shows vote count, answer count, tags, author information, and view count. Popular tags are surfaced in a sidebar widget with AI-powered personalized recommendations.  
  * **Asking Questions**:  A modal-based interface with a full Markdown editor (EasyMDE), tag selection with live search (up to 5 tags), anonymous posting option, and AI-powered duplicate detection that warns users when their question title matches existing content before submission

  * **Voting System**: Users can upvote or downvote questions and answers with optimistic UI updates — the vote count increments immediately on user action and is confirmed asynchronously by the server. Casting the same vote removes it (toggle); switching votes updates the count accordingly. Self-voting is blocked. Vote state is cached in localStorage for offline resilience and synced on reconnection.

  *  **Real-time Interaction**: Powered by Socket.io — on page load, the client establishes a WebSocket connection and emits a question:join event with the question ID to join a dedicated per-question room. When another user casts a vote or posts an answer, the server broadcasts vote:updated and answer:created events to the room, and all connected clients update the UI in real time without a page refresh. New questions are also broadcast globally via question:created.

  * **Course Discussions**: A separate thread-based discussion system scoped to individual courses, with open/closed thread status, real-time typing indicators via Socket.io, and post-level moderation. Accessible from the main Community page via a dedicated navigation button.


  

* **AI**: The AI Tutor page communicates with a backend chatbot service that sends user queries and returns AI-generated responses. If the primary route fails, the service retries against a fallback endpoint. The Recommendation System page fetches ML-based course and track recommendations, with a local heuristic fallback that computes recommendations from available grade data when the recommendation microservice is unreachable.


* **API communication:** it is handled through a centralized request function that wraps the native Fetch API. Every request automatically attaches the JWT from localStorage as an authorization header. When a 401 response is received, the system silently refreshes the token via a dedicated endpoint and retries the original request, providing seamless session maintenance. Seven backend microservices are supported, each with independently configurable base URLs that can be overridden through query parameters, localStorage keys, or compile-time defaults.

## **5.4 Backend Implementation**

The backend of the Nibras platform is implemented using NestJS and follows a modular architecture that emphasizes scalability, maintainability, and secure API design. The system exposes RESTful services and integrates multiple subsystems to support competitive programming, online learning, and community interaction.

* **RESTful API Communication:** The backend exposes a comprehensive set of RESTful APIs that serve as the primary communication layer between the frontend and backend. These APIs follow REST principles by utilizing standard HTTP methods, meaningful status codes, and JSON-formatted responses. API documentation is generated automatically using Swagger, enabling developers to explore and test endpoints efficiently, while dedicated health-check endpoints monitor the availability of core services such as MongoDB and Redis.  
* **Authentication and Authorization:** Nibras implements a secure authentication mechanism that supports both GitHub OAuth and email-based magic links. After successful authentication, the system generates a session token that is stored securely and validated for every protected request. User sessions are cached using Redis to improve performance, while role-based access control (RBAC) ensures that users can only access resources according to their assigned roles and permissions.  
* **Competitive Programming Engine:** One of the platform's core components is the competitive programming engine, which periodically synchronizes contest information from multiple online programming platforms. The backend processes contest data, computes rankings and ELO rating updates, and stores live standings using Redis. Real-time updates are delivered to connected users through WebSocket communication, ensuring that contest leaderboards remain synchronized without requiring manual page refreshes.

* **Assessment and Code Execution:** Programming assignments and coding assessments are evaluated within isolated Docker containers to ensure security and consistency. Submitted code is compiled and executed against predefined test cases for multiple programming languages. The backend records execution results, evaluates correctness, performs plagiarism detection using MOSS with a local similarity fallback, and stores detailed submission statistics for later analysis.  
* **Gamification System:** The backend includes a gamification engine that tracks user activities such as course completion, contest participation, coding practice, and community engagement. Based on these activities, the system calculates experience points, evaluates badge eligibility, and updates weekly, monthly, and overall leaderboards automatically, encouraging continuous learning and participation.  
* **Community Services and AI Chatbot:** The platform provides discussion forums where users can create posts, ask questions, and interact with other learners. Real-time notifications and discussion updates are delivered through WebSockets to enhance user engagement. Additionally, the backend integrates with an external AI chatbot service through HTTP APIs to provide intelligent assistance and answer users' educational queries.  
* **Course and Learning Management:** The backend manages the complete learning workflow, including course creation, enrollment requests, lesson management, progress tracking, and learning analytics. It records students' progress throughout each course, monitors completion rates, and provides statistical insights that help instructors evaluate learner engagement and overall course effectiveness.  
* **Business Logic in the Service Layer:** The core business logic is encapsulated within the service layer, ensuring that application rules remain independent of controllers and infrastructure components. Services coordinate authentication, contest synchronization, code evaluation, gamification, and course management, making the backend modular, reusable, and easier to maintain and extend.  
* **Programs and Curriculum Planning:** The backend provides a complete academic advising subsystem that manages degree and major requirement planning. It supports multi-version program definitions, prerequisite graph validation, and student plan creation with submission for advisor review. Students can create petitions to request exceptions to degree requirements, and advisors can approve or reject plans through a structured workflow. The system includes track recommendation and selection, plan conflict detection to prevent scheduling errors, and catalog course management with prerequisite dependencies, enabling the platform to guide students through their entire academic journey.  
* **Project Management and Tracking:** The platform manages the full project lifecycle, from creation to grading. Instructors define projects with starter bundles and task manifests, while students set up project repositories through automated GitHub provisioning. The system tracks milestone progress, verifies submissions through GitHub-integrated pipelines, and supports both individual and team-based projects. Team formation includes auto-generation and locking mechanisms, role applications, and interest expressions. Code review workflows allow instructors to provide structured feedback, and instructor oversight dashboards consolidate project status across all enrolled students.  
* **Learning Analytics Engine:** A comprehensive analytics service operates at three levels — platform-wide, per-course, and per-student. At the platform level, it provides aggregate enrollment, completion, and engagement metrics with trend analysis. Per-course analytics include section-by-section video completion tracking and per-assignment performance breakdowns. Per-student analytics track individual progress over time and include at-risk student identification using configurable risk thresholds based on engagement patterns and grade trends. Cohort-based filtering enables comparative analysis, and all analytics data can be exported as CSV files for offline processing.  
* **Daily Problem System:** A daily coding challenge engine delivers one problem per day from competitive programming platforms, with configurable difficulty preferences and tag-based problem selection. The system tracks solving streaks with timezone-aware scheduling and supports streak freezes and a vacation mode that allows students to pause and resume without losing their progress. A calendar view displays problem history, and a dedicated leaderboard ranks students by streak length and consistency, encouraging daily practice habits.  
* **Notification System:** The backend delivers real-time notifications covering community activity, submission status changes, course updates, and administrative actions. Users can manage per-type notification preferences, configure email notification addresses, and batch mark notifications as read. The system tracks unread notification counts and supports multiple notification channels, ensuring users stay informed about relevant platform events without being overwhelmed.  
* **Online IDE and Code Sandbox:** A browser-based code editor integrates with Judge0 to provide secure sandboxed code execution directly within the platform. The IDE supports multiple programming languages through a curated language selection and provides real-time execution status updates via server-sent events (SSE). Students can write, compile, and execute code without leaving the platform, and the system supports problem verification against competitive programming platforms to confirm solutions.  
* **GitHub Integration Service:** The platform provides deep GitHub integration that supports OAuth web login, device flow authentication for CLI clients, and GitHub App installation with webhook handling for push and pull request events. The service validates repositories, provisions student project repositories automatically, and processes webhook payloads to trigger submission verification pipelines. This integration enables a seamless development workflow where students work in their own GitHub repositories while the platform tracks and evaluates their progress.  
* **Administration and Moderation Panel:** A comprehensive administration service provides user management capabilities including role changes, account bans, and profile editing. Administrators can oversee submissions with status overrides, view verification logs, retry failed verification jobs individually or in bulk, and manage courses with enrollment statistics. The system maintains audit logs of administrative actions, provides platform configuration management for runtime settings, and supports project archival for completed or deprecated content.  
* **AI-Powered Platform Intelligence:** Beyond the AI chatbot, the backend implements several AI-driven features for platform intelligence. AI question routing ranks qualified responders for community questions using cosine similarity between question embeddings and responder expertise profiles. Duplicate question detection warns users before they submit questions similar to existing ones. AI-generated answer suggestions provide instructors and teaching assistants with draft responses accompanied by confidence levels. Personalized learning recommendations surface relevant courses, practice problems, and community threads based on user activity. The platform also supports Bring Your Own Key (BYOK) credential management, allowing students to configure their own OpenAI API keys for AI-powered features.  
* **Reputation System:** The backend implements a reputation scoring system that tracks and displays user contributions across the platform. Reputation is earned through community activities including asking questions, providing answers, receiving accepted answer marks, and accumulating votes. Reputation scores are scoped by user privacy settings, allowing users to control the visibility of their scores. The system provides both per-user reputation queries and platform-wide reputation rankings.  
* **CLI Application:** A published npm package (@nibras/cli, invoked via the nibras command) provides terminal-based access to core platform features. Students can submit projects, track milestone progress, manage course enrollments, and authenticate via GitHub device flow directly from the command line. The CLI provides a rich terminal user interface with progress bars, spinners, gradient-colored output, and structured status displays, enabling developers to interact with the platform without leaving their development environment.  
* **Background Worker Service:** A dedicated BullMQ-based worker runs as a separate service to process asynchronous jobs that would otherwise block API response times. The worker handles submission grading and verification, competition data synchronization from external platforms, daily problem generation and scheduling, GitHub webhook event processing, notification delivery, and analytics computation. By isolating these compute-intensive and time-sensitive operations into a standalone service, the platform maintains low API response latency even during peak processing periods.

## **5.5 AI Microservice Implementation**

**Recommendation Microservice Implementation**

The Recommendation Microservice is a standalone Python service developed using Flask that transforms a student's academic performance, community activity, quiz results, and problem-solving history into ranked Computer Science specialization track recommendations. The service combines deterministic feature engineering, machine learning inference, a multi-signal LLM scoring layer, and a comprehensive local explainability system within a unified recommendation pipeline.

---

**Grade-to-Capability Mapping**

The recommendation process begins by converting raw academic grades into a twelve-dimensional capability representation. The grades\_to\_capabilities() function processes each submitted course by retrieving its capability weight distribution from the course knowledge base and normalizing the student's grade from a 0–100 scale to a value between 0 and 1\.

For every capability, weighted contributions from all relevant courses are accumulated and combined using a weighted averaging scheme. This ensures that courses with stronger associations to a capability contribute proportionally more to the final score. Courses not found in the knowledge base are recorded as unknown courses and returned as structured warnings within the API response.

**Feature Engineering**

After capability extraction, the service constructs a twenty-eight-dimensional feature vector used as input to the machine learning model.

The feature vector consists of three groups of features:

* Twelve capability scores representing the student's competency levels across all capabilities.  
* Eight cosine similarity scores measuring alignment between the student's capability profile and each specialization track profile.  
* Eight weighted dot-product scores measuring the degree to which the student's strengths match the capabilities prioritized by each track.

Together, these features capture both relative capability alignment and absolute capability strength.

---

**XGBoost Multi-Class Classification**

The core recommendation model is an XGBoost classifier trained using the multi:softprob objective. Instead of producing a single class prediction, the model generates a probability distribution across all eight specialization tracks.

The model was trained on one thousand synthetically generated student profiles designed to cover a wide range of capability combinations. Hyperparameters were optimized using RandomizedSearchCV with five-fold stratified cross-validation to maximize generalization performance.

During inference, predict\_proba() generates track probabilities, which are ranked in descending order to produce the initial recommendation list. The associated LabelEncoder converts model class indices into human-readable track names.

---

**Track Profile Architecture**

Each specialization track is represented by a weighted capability profile defined within the system configuration.

These profiles serve three distinct purposes:

* Feature generation through weighted dot-product computation.  
* Similarity measurement through cosine similarity.  
* Capability-by-capability comparison within the explainability layer.

All profiles are normalized to sum to 1.0 and are converted into NumPy vectors during service initialization to minimize computational overhead during inference.

---

**Multi-Signal LLM Scoring**

The service collects four independent LLM-based signals and combines them into a single per-track score that complements the ML model output.

The Four Signals

Community Comment (get\_community\_scores) The student's free-text community comment is evaluated by GPT-4o-mini, which assigns a relevance score (0.0–1.0) to each CS track based on the expressed interests and preferences. When candidate tracks are already available from the ML stage, the model is instructed to zero-out scores for tracks clearly unrelated to those candidates, reducing noise from generic comments.

Quiz Answers (get\_quiz\_scores) The LLM performs NLU on the student's correct quiz answers. It first identifies the CS concepts demonstrated by each answer, then maps those concepts to track relevance scores. Up to twenty answers are processed per call.

Problem-Solving Activity (get\_problem\_solving\_scores) The student's competitive programming or CTF activity is converted into track scores. Raw platform tags from Codeforces, LeetCode, and TryHackMe are first normalized to standard problem types via PLATFORM\_TAG\_MAP. Counts are then converted to proportions, and the LLM uses the predefined PROBLEM\_TYPE\_TRACK\_MAP (covering 36 problem types) as a reference to compute a weighted contribution per track.

Grades Context (get\_grades\_scores) Unlike the ML model's mechanical grade multiplication, the LLM interprets the student's course history as a pattern. Each course is presented with its capability focus areas. The LLM reasons about the overall combination of courses rather than scoring them in isolation, and can downweight a single outlier course that contradicts the broader pattern. An optional summary of other signals is provided to help resolve ambiguity.

**Signal Aggregation**

get\_llm\_track\_scores() combines all four signals via a weighted average. Each signal carries equal weight:

| Signal | Weight |
| :---- | :---- |
| Community comment | 0.25 |
| Quiz answers | 0.25 |
| Problem solving | 0.25 |
| Grades context | 0.25 |

Only signals that are actually provided are included; weights are renormalized automatically over the available signals.

**Soft Voting and Final Ranking**

After both ML and LLM scores are obtained, soft\_vote() blends them into the final track ranking using a configured weight split of 40% ML / 60% LLM. The LLM carries higher weight because the ML model was trained on synthetic data.

When a track's LLM score is zero, a penalty is applied — the track receives only 60% of its ML score instead of the full weighted average. Tracks with a final blended score below 0.05 are filtered out entirely.

Tracks that were not in the ML top-k but were promoted by the LLM have their similarity and weighted-fit statistics computed on the fly and are flagged with llm\_promoted: true in the response.

**Deterministic Explainable AI (XAI)**

Every recommendation includes a fully deterministic explanation generated without additional AI model calls.

The explain\_recommendation() function produces four explanation components:

* Top Capabilities — the student's strongest capabilities accompanied by descriptive performance labels.  
* Top Courses — the courses that contributed most strongly to the recommended track.  
* Track Fit Analysis — a capability-level comparison between student strengths and track requirements.  
* Recommendation Summary — a natural-language explanation highlighting the strongest factors supporting the recommendation.

Because this explanation is generated entirely through deterministic calculations, it remains transparent, reproducible, and free from hallucination risk.

**Extended XAI**

The system also provides a deeper explanation layer covering:

* Rejection reasons for non-selected tracks, citing low ML probability, weak LLM assessment, or specific capability gaps.  
* LLM influence analysis, identifying which tracks were promoted or demoted relative to the pure ML ranking.  
* Confidence assessment (High / Moderate / Low) based on the level of agreement between ML and LLM signals.  
* Feature importance breakdown, ranking the student's top capabilities by impact and assessing overall profile strength.

Fit Health Check

Each final recommendation is checked for capability gaps. If a track requires a capability with weight ≥ 0.15 and the student's score in that capability falls below 70% of the requirement, a fit\_warning is included in the response, advising the student to strengthen those specific areas.

**Student-Facing XAI**

explain\_recommendation\_to\_student() generates a personalized, student-readable explanation for the top recommended track. Unlike the deterministic XAI layer, this explanation is produced by GPT-4o-mini and references actual course names, specific quiz answers, and concrete problem types from the student's profile. It covers six dimensions: overall summary, grades signal, comment signal, quiz signal, competitive programming signal, and confidence level. The function falls back to generic templated text if the API call fails.

---

**Dynamic Course Knowledge Base Extension**

The recommendation service supports runtime expansion of the course knowledge base.

When a previously unknown course is submitted through the /api/courses/add endpoint, GPT-4o-mini is prompted to generate a capability-weight distribution using the platform's twelve-capability framework. The generated weights are normalized, validated, persisted to course\_weights.json, and loaded into memory immediately.

This enables newly added courses to participate in future recommendations without requiring code modifications or service redeployment.

Input Validation and Error Handling

All four input signals — grades, top\_comment, correct\_answers, and problem\_type\_ranks — are required fields. Requests missing any of them receive a descriptive HTTP 400 response listing the missing fields.

Submitted grades are verified to ensure they are numeric values within the accepted range of 0–100. Capability vectors are validated to confirm the presence of all required dimensions and to reject invalid all-zero profiles.

Unknown courses are treated as warnings rather than fatal errors, allowing recommendation generation to continue using all recognized courses.

**AI Chatbot Microservice Implementation**

The AI Chatbot Microservice is a standalone Flask-based service that functions as the conversational intelligence layer of the Nibras platform. It combines GPT-4o-mini, deterministic classification mechanisms, semantic retrieval, and explainability features to provide contextual educational assistance for Computer Science students.

**Question Classification Architecture**

The central component of the chatbot is the generate\_ai\_answer() function.

Each submitted question is processed by GPT-4o-mini using a carefully engineered system prompt that defines seventeen Computer Science knowledge domains. The model is required to produce structured JSON responses containing:

* Classification status.  
* Generated answer.  
* Topic tags.  
* Three progressive hints.  
* Explainability metadata.

This architecture ensures consistent outputs while supporting reliable downstream processing.

**Seventeen-Domain Knowledge Boundary**

The system prompt explicitly defines the scope of supported Computer Science topics across seventeen knowledge domains, including programming, algorithms, operating systems, computer networks, databases, cybersecurity, software engineering, artificial intelligence, machine learning, and theoretical Computer Science.

These boundaries improve classification accuracy while restricting refusals to only three situations:

* Clearly unrelated questions.  
* Inappropriate content.  
* Harmful requests.

Questions with any plausible Computer Science interpretation are intentionally treated as valid educational requests.

**Deterministic Tag Correction**

After GPT-generated classification, a deterministic correction layer refines topic assignments.

The correct\_tags() function uses the curated TAG\_CORRECTION\_MAP knowledge base and word-boundary regular-expression matching to identify domain-specific terminology. This layer improves classification accuracy for highly technical vocabulary, abbreviations, command-line terminology, and cybersecurity concepts.

Additional ambiguity handling prevents common words from triggering incorrect classifications when used outside technical contexts.

**Secondary Classification and Retry Strategy**

To reduce false refusals, the chatbot employs a secondary verification stage.

When GPT-4o-mini classifies a question as off-topic, the system invokes a lightweight binary classifier through is\_cs\_related(). If the secondary classifier identifies a valid Computer Science interpretation, answer generation is repeated with a forced-answer instruction appended to the prompt.

Only questions rejected by both stages are ultimately refused.

**Arabic and Short Query Expansion**

The expand\_query() preprocessing module improves semantic retrieval quality for short and multilingual questions.

Questions containing Arabic text or four words or fewer are automatically expanded into complete English Computer Science questions before embedding generation. This produces richer semantic representations and significantly improves retrieval accuracy within the predominantly English-language community knowledge base.

**Semantic Retrieval Pipeline**

Following classification, corrected topic tags drive a tag-based semantic search process.

For each of the highest-ranked tags, relevant community questions are retrieved and compared against the expanded query using semantic embeddings. Similarity is computed using both title-only embeddings and title-plus-body embeddings.

A Jaccard keyword-overlap bonus is added to the cosine similarity score to improve ranking precision. Questions exceeding the configured similarity threshold are returned as community matches rather than newly generated answers.

**Embedding Cache Architecture**

To reduce API costs and improve response time, all generated embeddings are cached within a local SQLite database.

The cache stores both title-only and title-plus-body embeddings and automatically retrieves existing vectors whenever possible. Uncached texts are processed through batched embedding requests and stored immediately for future reuse.

This architecture allows most retrieval operations to be completed without generating new embeddings for previously processed community content.

**Explainable XAI Layer**

Every generated response includes an Explainable XAI component designed to improve transparency and learning effectiveness.

The explanation contains:

* The reasoning process used to answer the question.  
* Core concepts involved in the response.  
* Technical terms that may be unfamiliar to beginner students.

The /api/explain endpoint provides contextual explanations for these terms, enabling students to explore unfamiliar concepts without interrupting their learning workflow.

**Conversational Context Support**

The chatbot supports multi-turn educational interactions through conversational history management.

The /api/ask endpoint accepts previous conversation turns and appends up to ten recent exchanges to the model context. This allows GPT-4o-mini to maintain continuity, resolve references, and avoid repeating previously discussed explanations.

AI-to-Community Knowledge Contribution

The /api/answer-question endpoint enables the chatbot to contribute generated answers directly to the Nibras community knowledge base.

When invoked, the endpoint generates a complete answer using the standard AI pipeline and publishes it to the Railway backend using the configured AI account. This mechanism continuously enriches the community repository with new educational content that can later be discovered through semantic search.

## **5.6 Integration**

The Nibras platform integrates multiple internal modules and external services to provide a seamless learning experience. The backend acts as the central communication layer, coordinating requests between client applications, databases, and third-party services.

* **Unified API Endpoints:** Both the web and mobile applications communicate with the same set of RESTful APIs exposed by the NestJS backend. This unified API architecture ensures consistent business logic across platforms, eliminates code duplication, and enables new features to be deployed simultaneously for all client applications.  
* **Session-Based Authentication Integration:** User authentication is managed through a centralized session-based mechanism that supports GitHub OAuth and email magic-link authentication. Once a user is authenticated, a secure session token is created and stored in Redis and MongoDB. All subsequent requests are validated by the backend, providing a secure and consistent user experience across different devices and platforms.  
* **Competitive Programming Platform Integration:** Nibras integrates with multiple competitive programming platforms, including Codeforces, LeetCode, AtCoder, CodeChef, HackerRank, and CTFtime. Dedicated synchronization services periodically retrieve contest information, standings, and problem metadata from these external platforms. The collected data is processed and stored locally, allowing users to access up-to-date contest information directly through the Nibras platform.  
* **Code Execution and Assessment Integration:** When a user submits a programming solution, the backend forwards the source code to a Docker-based execution environment where it is compiled and executed against predefined test cases. The execution results, including correctness, runtime statistics, and error information, are returned to the backend, which stores the results and presents detailed feedback to the user.  
* **AI Chatbot Integration:** The AI Tutor page integrates with a backend chatbot service that processes user questions through a Retrieval-Augmented Generation (RAG) pipeline. User queries are sent via chatbotService.ask(), and the AI-generated responses are rendered with Markdown formatting and syntax-highlighted code blocks. The system supports publishing AI answers to the Community Q\&A, where they appear with confidence badges (high/medium/low) and review status indicators. Instructors can approve or reject AI-generated answers, and users can provide thumbs-up/down feedback to improve response quality. The Community section also features AI-powered duplicate detection that warns users when their question title matches existing content, and an AI-powered recommendation widget that suggests personalized resources based on user activity.

      

## **5.7 Validation and Testing**

A multi-faceted testing methodology was employed to ensure the platform's reliability, functionality, and user satisfaction across all layers of the application.

5.7.1 Testing Methodology:

* **Unit Testing:** Focuses on verifying the smallest testable parts of the application in isolation to ensure they behave correctly.  
    
  * **Backend Services:** Backend unit tests are implemented using Jest v30 with ts-jest for TypeScript compilation and @nestjs/testing for bootstrapping isolated NestJS modules. HTTP endpoint assertions are performed using Supertest. To ensure reproducible test environments without requiring external infrastructure, mongodb-memory-server and redis-memory-server are used to spin up ephemeral in-memory database instances for each test run. Unit test suites cover critical modules including the health controller, session authentication service, competitive programming platform fetchers (Codeforces, HackerRank), contest and standings services, contest duration utilities, and role hierarchy validation. End-to-end (E2E) tests validate complete request lifecycles across authentication flows, assessment operations, and competition endpoints using a full NestJS test application with global setup and teardown hooks. The Python AI Tutor microservice maintains its own test suite using pytest, covering tag correction logic, RAG context building, configuration threshold defaults, and history limit boundary validation.

  * **Frontend Components:** UI pages were validated through manual functional testing in modern browsers (Chrome, Firefox, Edge, Safari) to verify rendering accuracy, API communication, and complete user flow execution. All JavaScript files pass automated syntax validation via node \--check in the CI pipeline, preventing syntactically invalid code from reaching production.  
      
* **Integration Testing:** Verifies the interactions between different modules to ensure they work together as expected. This included testing the complete data flow between the frontend clients, the NestJS backend, the Python AI microservices, and the MongoDB and PostgreSQL databases to catch issues at the component boundaries.  
    
* **User Acceptance Testing (UAT):** Conducted with a diverse group of students and faculty. This phase was crucial for gathering qualitative feedback on the platform's overall flow, identifying usability issues, refining the UI/UX, and ensuring that the features and feedback were genuinely helpful and intuitive for the target audience.

5.7.2 Example Tests:

* **Authentication Flow Validation**: The complete authentication cycle was manually tested across all three methods — email and password login, Google OAuth, and Microsoft OAuth. Test cases included successful login with role-based redirect verification, login with invalid credentials showing appropriate error messages, OAuth callback handling with proper token extraction from URL fragments, and automatic token refresh when an expired token triggered a 401 response.


* **Community Voting System**: The real-time voting mechanism was validated by opening two browser sessions on the same question. A vote cast in the first session was observed to propagate to the second session within seconds through the Socket.io connection. Optimistic UI updates were tested by temporarily disabling network connectivity and verifying that vote counts were updated immediately in the UI and synchronized correctly when the connection was restored.

## **5.8 Deployment**

The Nibras platform follows a component-based deployment strategy where each microservice is hosted in the environment best suited for its operational requirements. Optimizing performance, scalability, and developer workflow. 

* **Frontend Web (React.js): Deployed on Vercel**  
  * **Explanation:** The React.js frontend is deployed on Vercel, a platform specializing in hosting modern web applications. Vercel provides seamless integration with frontend frameworks through its Git integration, which enables automated CI/CD pipelines directly from GitHub. Its global CDN (Content Delivery Network) ensures exceptionally fast page load times for users worldwide, significantly improving the user experience.

* **Backend API (NestJS): Deployed on Railway**  
  * **Explanation:** The primary NestJS backend API is deployed on Railway, a cloud platform that provides container-based deployments with integrated database and caching add-ons. The application is containerized using a multi-stage Docker build based on the Node 20-alpine image, runs as a non-root user for security, and exposes port 3000. Railway's Git-based deployment pipeline automatically builds and deploys the service whenever changes are pushed to the repository, while environment variables and secrets are managed through Railway's configuration interface.

* **Fastify API Service: Deployed on Railway**  
  * **Explanation:** The secondary Fastify-based API service handles AI features, program and curriculum planning, project tracking, analytics, and other second-generation endpoints. It runs as a separate Railway service on port 4848, using Prisma ORM for PostgreSQL database access and BullMQ for job queue orchestration. This separation allows the newer API layer to evolve independently from the legacy NestJS API while sharing the same database infrastructure.

* **Background Worker Service: Deployed on Railway**  
  * **Explanation:** A dedicated BullMQ-based worker service is deployed as its own Railway instance to process asynchronous background jobs including submission grading, competition data synchronization, daily problem generation, GitHub webhook processing, notification delivery, and analytics computation. Running the worker as a separate service isolates compute-intensive tasks from the API services, ensuring that long-running jobs do not affect API response latency.

* **AI Tutor Microservice (Python/Flask): Deployed on Railway**  
  * **Explanation:** The AI Tutor chatbot microservice is containerized using a dedicated Python Dockerfile and deployed on Railway as an independent service running on port 5000. The service integrates FAISS for vector-based semantic search, maintains a local SQLite embedding cache to reduce API costs, and communicates with OpenAI APIs for GPT-4o-mini inference and text-embedding-3-small embedding generation. Railway's persistent storage ensures that the embedding cache and configuration persist across deployments.

* **AI Recommendation Microservice (Python/Flask): Deployed on Railway**  
  * **Explanation:** The recommendation engine runs as an independent Railway service, loading serialized XGBoost model artifacts (model.pkl and label\_encoder.pkl) and the course knowledge base (course\_weights.json) at startup. The service combines machine learning inference with a multi-signal LLM scoring layer to generate specialization track recommendations. Its stateless design allows horizontal scaling when recommendation request volumes increase.

* **Database Layer: MongoDB Atlas and Railway PostgreSQL**  
  * **Explanation:** The platform uses a dual-database architecture. MongoDB, hosted on MongoDB Atlas, stores document-oriented data including courses, competitions, community posts, user activities, and gamification records, leveraging its flexible schema for diverse educational content. PostgreSQL, provisioned as a Railway add-on, manages relational data including programs, curriculum plans, project tracking, user profiles, and submission records through Prisma ORM with full migration support. This hybrid approach allows each database to handle the data model it is best suited for.

* **Caching and Job Queue: Railway Redis**  
  * **Explanation:** Redis is provisioned as a Railway add-on and serves multiple critical functions across the platform. It provides session storage for authenticated users, caching for frequently accessed data such as leaderboards and contest standings, rate limiting for API endpoints, and serves as the message broker for BullMQ job queues that coordinate work between the API services and the background worker.

* **Gateway/Proxy Service: Deployed on Railway**  
  * **Explanation:** An HTTP proxy service deployed on Railway listens on port 8080 and routes incoming requests to the appropriate backend service based on URL path prefixes. It also serves the static frontend assets from the client directory, providing a unified entry point for all platform traffic and simplifying DNS and SSL certificate management.

