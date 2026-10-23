# CampusVoice

**Report it. Rate it. Get it fixed.**

CampusVoice is a student-built web platform where students can send problems to the right people, rate teachers anonymously, and write honest public reviews of their college.

Live site: https://campusvoice-igc.netlify.app

All project files are inside the `CampusVoice` folder.

## Features

- **Problem Sender:** students send a problem (with up to two photos) to the Warden, a Teacher or the Principal, and track its status and the staff remark live.
- **Teacher Appreciation:** anonymous 1 to 5 star ratings on teaching clarity, punctuality, doubt solving and behaviour. A teacher appears in Top Rated only after three ratings, and each student can rate a teacher once.
- **College Rater:** public reviews of mess food, study quality, hostel, campus and Wi-Fi, with average score bars, sorting and a branch filter.
- **Roles:** Student, Teacher, Warden, Principal and Super Admin. Staff register as pending and are approved by the Principal or Super Admin.
- **Live alerts:** dashboards update without a refresh and show pop-up notices.
- **Campus overview:** charts and numbers for the Principal and Super Admin, plus a CSV download.
- **Phone friendly:** responsive layout, bottom navigation bar, light and dark mode, Add to Home Screen, QR poster page and a share button.
- **University concept page:** a preview with sample data of how a University could see college-level results.

## Built with

- HTML, CSS and JavaScript
- Firebase Authentication and Cloud Firestore
- Firestore security rules
- Netlify for hosting

## Run it on your computer

1. Install Visual Studio Code and the Live Server extension.
2. Open the CampusVoice folder in VS Code.
3. Right-click index.html and choose Open with Live Server.

## Security notes

- The Firebase web config is not a secret. Data is protected by the login and the security rules.
- Never commit passwords or private keys to this repository.

## Known limitations

- This is a prototype. Anyone with the link can register as a student, so real use needs student verification.
- Reviews cannot be edited or removed by design, so a real deployment needs a moderation policy.
- Alerts are in-app only. Email or SMS alerts would need server code.

## Team

- Anmol (B.Tech CSE)
- Abid Choudhry (B.Tech Civil)
- Sojanya (B.Tech CSE)

Built for a hackathon with AI-assisted guidance.
