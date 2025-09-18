# 10075-2000110656 Financial Document Comparison Platform

## Overview

This is a full-stack financial document analysis platform that enables instant, error-reduced side-by-side comparisons from company filings, KPIs, and optional web data. The system accepts company PDFs/HTML (10-K/10-Q), research notes, and CSV KPIs, then uses AI to extract and normalize financial metrics for comparative analysis.

The platform is built as a modern web application with React frontend and Express backend, featuring AI-powered document processing, metric normalization, and automated comparison generation with exportable results.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components with Radix UI primitives for accessible, customizable interface components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express framework in ESM module format
- **Language**: TypeScript with strict type checking enabled
- **File Processing**: Multer middleware for file uploads with memory storage
- **Document Processing**: 
  - PDF parsing via pdf-parse library for extracting text from financial documents
  - HTML parsing using node-html-parser for web-based filings
  - Support for plain text and CSV file formats

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL integration
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Development Storage**: In-memory storage implementation for development/testing

### Database Schema Design
- **Companies Table**: Stores company information with normalized names for consistent matching
- **Documents Table**: Tracks uploaded files with metadata and processing status
- **Financial Metrics Table**: Stores extracted financial data with standardized KPI fields
- **Comparisons Table**: Maintains comparison results and AI-generated insights

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **File Security**: 10MB file size limits and type validation for uploaded documents
- **CORS**: Configured for cross-origin requests in development environment

### AI Integration and Processing
- **OpenAI Service**: Azure OpenAI integration for document analysis and metric extraction
- **Document Processor**: Multi-format document text extraction and preprocessing
- **KPI Normalizer**: Synonym mapping and metric standardization system
- **Insight Generation**: AI-powered comparison analysis with categorized insights

### API Architecture
- **RESTful Design**: Express routes with proper HTTP methods and status codes
- **Error Handling**: Centralized error handling middleware with structured error responses
- **Request Logging**: Comprehensive request/response logging for API endpoints
- **Validation**: Zod schema validation for request/response data integrity

### Development and Build Tools
- **Build System**: Vite for frontend builds, esbuild for backend bundling
- **Type Safety**: Shared TypeScript types between frontend and backend
- **Path Mapping**: Alias configuration for clean imports (@, @shared, @assets)
- **Hot Reload**: Vite HMR for development with Replit-specific plugins

## External Dependencies

### Core Framework Dependencies
- **Frontend**: React, Vite, TypeScript for modern web application development
- **Backend**: Express.js, Node.js for server-side JavaScript runtime
- **Database**: Drizzle ORM, PostgreSQL, Neon Database for data persistence

### UI and Styling Libraries
- **Component Library**: Radix UI primitives for accessible, unstyled components
- **Styling**: Tailwind CSS for utility-first styling approach
- **Icons**: Lucide React for consistent iconography
- **Animations**: Class Variance Authority for component variant management

### File Processing and AI Services
- **Document Processing**: pdf-parse for PDF text extraction, node-html-parser for HTML parsing
- **AI Processing**: OpenAI API (Azure endpoint) for document analysis and metric extraction
- **File Uploads**: Multer middleware for handling multipart form data

### Development and Build Tools
- **Build Tools**: Vite, esbuild for optimized bundling and development experience
- **Replit Integration**: Replit-specific Vite plugins for development environment
- **Session Storage**: connect-pg-simple for PostgreSQL-backed session management
- **Type Safety**: Zod for runtime type validation and schema definition

### Data Processing Libraries
- **Date Handling**: date-fns for date manipulation and formatting
- **State Management**: TanStack React Query for server state and caching
- **Form Management**: React Hook Form with Hookform Resolvers for form validation
- **Routing**: Wouter for lightweight client-side routing