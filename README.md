# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/9d5775a8-8591-40f7-9e2b-8964ae724410

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9d5775a8-8591-40f7-9e2b-8964ae724410) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9d5775a8-8591-40f7-9e2b-8964ae724410) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Video Calls with Agora

This application uses Agora for video calls between tutors and students. To set up Agora:

1. Create an account at [Agora.io](https://www.agora.io/)
2. Create a new project in the Agora Console
3. Get your App ID and App Certificate
4. Add the following to your `.env.local` file:

```
# Agora Video SDK Configuration
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate
```

The video call feature allows tutors and students to have face-to-face sessions with the following capabilities:
- Video and audio communication
- Screen sharing
- Muting/unmuting audio
- Turning video on/off

## Meeting Security

The application implements multiple layers of security for video meetings:

### Token Generation
- Uses the `agora-token` library for secure token generation
- Tokens are generated server-side with proper validation
- Tokens include proper expiration times and roles

### Access Control
- Meeting access is restricted to session participants only (tutor and student)
- Sessions must be in 'accepted' or 'started' status
- Both participants must be marked as 'ready'
- For scheduled sessions, access is only granted within 30 minutes of the start time

### Security Layers
1. **Middleware Protection**: Server-side checks prevent unauthorized access to meeting routes
2. **MeetingGuard Component**: Client-side component provides additional validation
3. **API Validation**: Token generation API validates session access rights
4. **Periodic Status Checks**: Sessions are continuously validated during the meeting

### Error Handling
- Clear error messages guide users when access is denied
- Automatic redirection to dashboard when sessions end or are cancelled

# Meeting System Changes

## Changes to Meeting Functionality

The meeting system has been updated with the following improvements:

### For Tutors:
1. **Start Meeting Button**: Tutors now have a dedicated "Start Meeting" button that appears when both participants are ready.
2. **Control Over Meeting Start**: Only tutors can start meetings, giving them more control over the session timing.

### For All Users:
1. **Instant Meeting Access**: Once a meeting is started, participants can immediately join the meeting link without waiting.
2. **Meeting Link Navigation**: When a tutor starts a meeting, they are automatically redirected to the meeting page.

### Technical Improvements:
1. **Fixed React Params Warning**: Updated the meeting layout to properly unwrap params using `React.use()`, fixing the "params is now a Promise" warning.
2. **Enhanced Video Playback**: Improved Agora video playback with retry mechanisms to prevent AbortError when loading is interrupted.
3. **Better Error Handling**: Added comprehensive error recovery for media tracks with graceful reconnection logic.
4. **Removed Time Restrictions**: Meeting access is no longer limited to 30 minutes before scheduled time, allowing users to join as soon as a meeting is started.

### Changes in Detail:
- The "Start Meeting" button is now visible to tutors but disabled until both participants mark themselves as ready
- Removed automatic meeting starting when both users are ready
- Meeting links become joinable as soon as a session has "started" status (both users ready is no longer required)
- The meeting now stays active once started, regardless of ready status changes after starting

These changes make the meeting experience more intuitive and puts control of the meeting in the hands of the tutors.
