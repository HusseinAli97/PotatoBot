# replit.md

## Overview

PotatoBoosting is a Discord bot designed to manage a professional boosting service order system. The bot automates the process of creating tickets, collecting order details, and managing service requests through a structured workflow. Built with Discord.js v14 and SQLite for data persistence, it provides a seamless experience for customers to place orders and for staff to manage them.

## System Architecture

The application follows a modular event-driven architecture typical of Discord bots:

- **Entry Point**: `index.js` initializes the bot, loads commands/events, and manages the Discord client
- **Database Layer**: SQLite database with a simple schema for order management
- **Event Handlers**: Separate modules for different interaction types (orders, tickets)
- **Command System**: Slash commands for administrative functions
- **Utilities**: Helper functions for embeds, permissions, and data formatting

## Key Components

### Database (SQLite)
- **Location**: `database.js` and `orders.db`
- **Schema**: Single `orders` table with fields for order tracking
- **Purpose**: Stores order information, status, and metadata
- **Rationale**: SQLite chosen for simplicity and no external dependencies

### Bot Client
- **Framework**: Discord.js v14
- **Intents**: Guilds, Members, Messages, MessageContent
- **Architecture**: Command and event-driven with modular file structure

### Order Management System
- **Components**: 
  - Service selection menu (6 service types)
  - Dynamic ticket channel creation
  - Order form collection via modals
  - Staff management buttons
- **Flow**: Button → Select Menu → Ticket Channel → Order Form → Staff Actions

### Role-Based Access Control
- **Roles**: VsC (customer), Staff (administrative)
- **Auto-assignment**: New members automatically receive VsC role
- **Channel Permissions**: Ticket channels visible only to customer and staff

## Data Flow

1. **User Registration**: New guild members → Auto-assign VsC role
2. **Order Initiation**: Order button → Private service selection menu
3. **Ticket Creation**: Service selection → Private ticket channel with unique ID
4. **Order Details**: Confirm button → Modal form → Database storage
5. **Staff Management**: Staff buttons for order completion/cancellation
6. **Order Completion**: Status updates → Channel cleanup

## External Dependencies

### NPM Packages
- `discord.js@^14.20.0`: Primary Discord API wrapper
- `sqlite3`: Database driver (referenced in .replit but not in package.json)

### Discord API
- **Permissions Required**: 
  - Manage Channels (create/delete ticket channels)
  - Manage Roles (assign VsC role)
  - Send Messages, Embed Links
  - Use Slash Commands

## Deployment Strategy

### Replit Configuration
- **Runtime**: Node.js 20
- **Auto-install**: Dependencies installed via workflow
- **Execution**: `npm install discord.js sqlite3 && node index.js`

### Environment Requirements
- Discord Bot Token (not included in repository)
- Guild ID for slash command registration
- Proper role and channel setup in Discord server

### Channel Structure Expected
- `🛒┊order-here`: Main order initiation channel
- `orders-details`: Staff order management
- `reviews`: Customer feedback
- Categories for each service type

## Recent Changes

- June 24, 2025: PotatoBoosting Discord bot fully implemented and deployed
- Fixed interaction timeout and permission errors in ticket creation system
- Implemented single-message notification system to order-details channel
- Added direct message notifications to all Staff role members instead of channel mentions
- Converted all notifications to English language
- Fixed channel detection to work with user's server structure (order-details channel)
- Bot successfully handles complete order workflow with proper notifications
- Added payment method selection system after order confirmation
- Integrated PayPal, Crypto, and Western Union payment options with detailed information
- Fixed emoji compatibility issues in payment method selection menu
- Updated database schema to store selected payment method

## Changelog

```
Changelog:
- June 24, 2025. Initial setup and full implementation
- Discord bot deployed with complete order management system
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Language preference: Can communicate in Arabic when needed for explanations.
```

## Architecture Decisions

### SQLite Over Cloud Database
- **Problem**: Need persistent storage for order data
- **Solution**: Local SQLite database
- **Rationale**: Simplicity, no external dependencies, sufficient for single-instance deployment
- **Tradeoffs**: Not suitable for distributed deployment but perfect for Replit hosting

### Modular Handler System
- **Problem**: Complex interaction handling for different UI components
- **Solution**: Separate handlers for orders and tickets
- **Rationale**: Separation of concerns, easier maintenance and debugging
- **Alternative**: Single monolithic handler (rejected for complexity)

### Role-Based Channel Access
- **Problem**: Secure order management and privacy
- **Solution**: Dynamic permission overwrites per ticket channel
- **Rationale**: Ensures privacy and proper access control
- **Implementation**: Custom permission utility functions

### Modal Forms for Data Collection
- **Problem**: Collecting structured order information
- **Solution**: Discord modal forms with text inputs
- **Rationale**: Native Discord UI, better UX than chat-based collection
- **Alternative**: Bot prompts in chat (rejected for UX reasons)