# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pickemV2 is a pick'em/prediction web application built with Next.js and TypeScript. The project includes AWS integration for cloud services and Linear integration for project management.

## Current State

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, App Router
- **Cloud Services**: AWS SDK integrated (S3, DynamoDB, Lambda)
- **Infrastructure**: Terraform configuration (in setup phase)
- **Project Management**: Linear MCP server configured
- **License**: MIT License

## Development Setup

### Prerequisites

- Node.js and npm
- AWS credentials configured
- Linear API key (for MCP integration)

### Getting Started

```bash
npm install
npm run dev
```

### Environment Variables

Set up your environment variables:

```bash
export AWS_ACCESS_KEY_ID=your_aws_access_key
export AWS_SECRET_ACCESS_KEY=your_aws_secret_key
export AWS_REGION=your_preferred_region
```

### Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Cloud**: AWS services (S3, DynamoDB, Lambda)
- **Infrastructure**: Terraform for AWS resource management
- **Project Management**: Linear integration via MCP server

## MCP Configuration

Linear MCP server is configured in `mcp-config.json` for project management integration.
