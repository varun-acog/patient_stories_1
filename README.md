# Automated Retrieval & Analysis of Disease-Related YouTube Content

## Table of Contents
1. [Overview](#overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Applications](#applications)
5. [Database Schema](#database-schema)
6. [Usage Workflow](#usage-workflow)
7. [Future Enhancements](#future-enhancements)

---

## Overview
This project automates the process of collecting and analyzing YouTube videos and transcripts related to various diseases. By leveraging **Large Language Models (LLMs)** and the **YouTube Data API**, the system classifies videos into categories such as *Patient Stories*, *KOL Interviews*, or *Conference Lectures*, and then extracts user-defined attributes from the transcripts in a structured format.

### Objectives
- **YouTube Data Ingestion**: Fetch video metadata and transcripts for disease-related queries.
- **Automatic Classification**: Categorize transcripts using LLMs (e.g., *Patient Story*, *KOL Interview*, *Conference Lecture*).
- **Custom Attribute Extraction**: Extract user-requested fields (e.g., *symptoms*, *location*, *challenges*) from transcripts.
- **Continuous Updates**: Periodically check for new videos and update the dataset accordingly.

### Scope
1. Accept disease names and query parameters (including fields for extraction).
2. Fetch video metadata and transcripts.
3. Classify transcripts into relevant categories.
4. Extract user-defined fields via LLM-based prompts.
5. Provide structured outputs (JSON-like format) and user-friendly data views.
6. Implement advanced search, filtering, and visualization capabilities.

---

## Key Features
- **Chronological Sorting & Filtering**: View patient stories by latest or filter by specific attributes.
- **Annotations & Notes**: Add comments or tags to each record (e.g., *Severe*, *Treatment Success*).
- **Embedded Video Viewing**: Watch the YouTube video without leaving the application.
- **Download & Export**: Download structured data or subsets of records as CSV.
- **Advanced Search & Keyword Highlighting**: Quickly locate references to specific symptoms or medical histories.
- **Interactive Data Visualization**: Generate charts to analyze trends (e.g., symptom frequency).
- **Automatic Monthly Update**: Identify the latest videos uploaded since the last fetch.

---

## System Architecture

### Workflow Diagram
Below is a high-level workflow diagram illustrating the main components of the system:

<img width="1167" alt="Screenshot 2025-03-12 at 1 25 36 PM" src="https://github.com/user-attachments/assets/c439e708-91b8-41dd-99d8-de36d8722b19" />



### High-Level Workflow
1. **User Input**  
   - Users submit a disease name and any additional fields to extract.  
   - These parameters are saved in the `SearchConfig` table for reference and reuse.

2. **Check Database for Existing Search Term**  
   - If the disease already exists:
     1. **Additional Attributes?**  
        - If new fields are requested, LLM extraction runs on stored transcripts.
     2. **Otherwise**  
        - Retrieve existing results directly.
   - If the disease is new:
     - Proceed to the **Media Ingestion Subflow**.

3. **Media Ingestion Subflow**  
   - **Video Fetcher**  
     - Uses Google’s YouTube Data API to search and retrieve metadata.
     - Presents the metadata to the user without storing it in the database.
   - **Transcript Fetcher**  
     - Retrieves transcripts using YouTube APIs or third-party transcription services.
     - Presents transcripts to the user without storing them in the database.

4. **LLM-Based Attribute Extraction**  
   - **Classification**: Labels transcripts as *Patient Story*, *KOL Interview*, or *Conference Lecture*.  
   - **Attribute Extraction**: Uses a “prompt library” to pull out fields like *name, symptoms, challenges*, etc.  
   - **Structured Output**: Saved as JSON in the `Extracted Data` table when the Database Manager is called.

5. **User-Specific Formatted Output**  
   - The user sees the final structured results (in JSON or other views).  
   - Additional advanced filtering, downloads, and visualizations are performed as needed.

---

## Applications
The system consists of six independent applications, each with a dedicated role:

### 1. **Video Fetcher (CLI Application)**
   - Fetches video metadata using the YouTube Data API.
   - Can be executed independently for testing and debugging.



### 2. **Transcript Fetcher (CLI Application)**
   - Retrieves transcripts for fetched videos.
   - Uses youtube-api library or external speech-to-text services if necessary.
  

### 3. **LLM-Based Extraction Module (CLI Application)**
   - Processes stored transcripts using LLMs.
   - Extracts structured information as per user requirements.
   - Outputs extracted data to be stored when Database Manager is called.

### 4. **Database Manager (Backend Service)**
   - Handles all CRUD operations on the database.
   - Provides service for querying, updating, and deleting records.
   - Ensures data consistency and versioning.
   - Stores metadata, transcripts, and extracted data when requested.

### 5. **Web Application (User Interface)**
   - The primary user-facing interface.
   - Allows users to initiate searches, view results, and analyze data.
   - Provides visualization tools, filtering, and annotation capabilities.

### 6. **Database Population Shell Script**
   - Runs periodically to fetch new data.
   - Also executes when a new search term is added.
   - Calls Video Fetcher, Transcript Fetcher, and Extraction Module in sequence.
   - Ensures the system remains updated with the latest YouTube content.

---

## Database Schema

### **SearchConfig**
- **param_id (PK)**: Unique identifier for the search parameter  
- **user_id (FK)**: References the user initiating the search  
- **search_phrase**: search phrases
- **search_name**: search term internally referred to
- **creation_date**: Timestamp of when the search was created  

### **Videos**
- **video_id (PK)**: Unique YouTube video identifier  
- **search_name**: Term associated with the video search  
- **title**: Video title  
- **description**: Description text from the video  
- **publish_date**:   
- **url**:  
- **view_counts**:   
- **duration**:
- **channel_name**:

### **Transcripts**

- **video_id (PK,FK)**: Unique YouTube video identifier
- **full_transcript**: Full text of the video transcript  
- **language**: Language of the transcript  

### **ExtractedData**
 
- **video_id (PK,FK)**: Unique YouTube video identifier
- **attribute_value (JSON)**: Extracted fields (e.g., video type, symptoms, location, etc.)  

---

## Usage Workflow

* git cone the LLM-COE repo and navigate to LLM-COE/LLM-Tech/patient_stories_llm/video_analysis
* Install the dependencies
  ```bash
  docker compose run app npm install
  ```
* Add these following to your .env file
```bash
USER_NAME=your-ldap-username
USER_PASSWORD=your-ldap-password
OLLAMA_BASE_URL=https://ollama.own1.aganitha.ai
LLM_MODEL=deepseek-r1:14b
YOUTUBE_API_KEY=your-youtube-api-key
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/video_analysis_db
```
* Build the application
  ```bash
  docker compose build app 
  docker compose up -d postgres
  ```
* To test each of the applications
Test Video Fetcher:
```bash
docker compose run app npx tsx bin/video-fetcher.ts 'cystic fibrosis patient stories' > video_ids.json
```
Test Transcript Fetcher:
```bash
cat video_ids.json | docker compose run -T app npx tsx bin/transcript-fetcher.ts > transcript_ids.json
```
Test LLM Analyzer:
```bash
cat transcript_ids.json | docker compose run -T app npx tsx bin/llm-analyzer.ts
```

* To test the entire application
```bash
docker compose run app sh -c "npx tsx bin/video-fetcher.ts 'cystic fibrosis patient stories' | npx tsx bin/transcript-fetcher.ts | npx tsx bin/llm-analyzer.ts"
```
* To verify the database
```bash
docker exec -it video_analysis-postgres-1 psql -U postgres -d video_analysis_db -c "SELECT COUNT(*) FROM videos;"

docker exec -it video_analysis-postgres-1 psql -U postgres -d video_analysis_db -c "SELECT COUNT(*) FROM transcripts;"
```
---

## Future Enhancements
1. **Real-Time Updates**: Continuous streaming-based approach for new video detection.  
2. **Additional Platforms**: Expand beyond YouTube to other video sources.  
3. **Speech-to-Text for Missing Transcripts**: For any videos lacking official transcripts, integrate AI-based speech-to-text models to generate transcripts automatically.  
4. **Ask-to-LLM Feature**: Implement a functionality that allows users to query the structured data directly.

