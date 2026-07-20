# AI Gym Portal Feature Specification

## 1. Super Admin / Gym Owner

The Super Admin controls the entire gym.

### Dashboard Metrics

- Total Members
- Active Members
- Expired Memberships
- Today's Revenue
- Monthly Revenue
- Trainers
- Attendance Today
- Upcoming Renewals
- Pending Payments
- Equipment Status
- Diet Plans Created
- Workout Plans Assigned

### Manage Trainers

- Add Trainer
- Edit Trainer
- Delete Trainer
- Assign Members

### Manage Members

- Register Member
- View Profile
- Membership Status
- Payment History
- Attendance
- Medical Details

### Membership Management

The Super Admin can create unlimited membership plans.

| Plan | Duration | Price |
| --- | --- | --- |
| Basic | 1 Month | Rs. 999 |
| Standard | 3 Months | Rs. 2499 |
| Premium | 6 Months | Rs. 4499 |
| Elite | 12 Months | Rs. 7999 |

### Payment Management

- Paid
- Pending
- Partial
- Renew Membership
- Invoice Generation
- GST Invoice

### Attendance

- Daily Check-in
- Today's Attendance
- Monthly Attendance Report

### Equipment Management

- Equipment Name
- Purchase Date
- Maintenance Date
- Warranty
- Status

### Diet Plan Library

Admin creates reusable diet templates.

Examples:

- Weight Loss
- Muscle Gain
- Fat Loss
- Bodybuilding
- Women Fitness
- Senior Fitness

### Workout Library

Admin creates reusable workout templates.

Examples:

- Chest
- Leg
- Back
- Shoulder
- Cardio
- HIIT

### AI Reports

- Revenue Graph
- Membership Trends
- Peak Gym Hours
- Attendance Heatmap

## 2. Trainer Dashboard

The Trainer only sees members assigned to them.

### Dashboard Metrics

- Today's Members
- Attendance
- Workout Schedule
- Pending Assessments
- Messages

### Trainer Features

### Assigned Members

- View Members
- Progress
- Weight
- BMI
- Fat %

### Workout Assignment

Example weekly workout assignment:

| Day | Workout |
| --- | --- |
| Monday | Chest |
| Tuesday | Back |
| Wednesday | Leg |
| Thursday | Shoulders |
| Friday | Cardio |
| Saturday | HIIT |
| Sunday | Rest |

### Diet Assignment

- Breakfast
- Lunch
- Dinner
- Snacks
- Calories
- Protein
- Water Intake

### Progress Tracking

- Weekly Weight
- BMI
- Body Fat
- Muscle Mass
- Measurements
- Before/After Photos

### Trainer Attendance

- Clock In
- Clock Out
- Working Hours

## 3. Member Dashboard

The Member Dashboard should feel like a modern fitness app.

### Dashboard Sections

- Welcome Card
- Membership Status
- Attendance
- Today's Workout
- Today's Diet
- Calories
- Water Intake
- Progress
- Upcoming Renewal

### Member Features

### Profile

- Photo
- Age
- Gender
- Height
- Weight
- Medical History
- Emergency Contact

### Membership

- Current Plan
- Start Date
- End Date
- Remaining Days
- Renew Button
- Payment History
- Invoice Download

### Workout

- Today's Workout
- Exercise Images
- Sets
- Reps
- Trainer Notes
- Completed Checkbox

### Diet Plan

- Breakfast
- Lunch
- Dinner
- Supplements
- Calories
- Protein
- Carbs
- Fat

### Attendance

- QR Code Check-in
- Face Recognition (Future AI)
- Manual Check-in
- Attendance History

### Progress

- Weight Graph
- BMI Graph
- Body Fat
- Measurements
- Before/After Photos

### Achievements

- Milestones
- Streaks
- Workout completion badges
- Attendance rewards

### Notifications

- Membership Expiring
- Trainer Message
- Gym Announcement
- Offer Notifications

## 4. AI Features

AI should be a major highlight of the product instead of only CRUD operations.

### AI Workout Generator

Input:

- Age
- Weight
- Height
- Goal

Output:

- Complete Workout Plan

### AI Diet Generator

Input:

- Weight
- Goal
- Food Preference

Output:

- Diet Chart

### AI Chatbot

Members can ask:

- What should I eat today?
- How many calories?
- Suggest exercises.

### AI Attendance Analytics

Detect:

- Peak Hours
- Inactive Members
- Busy Trainers

### AI Renewal Prediction

Predict:

- Likely to Renew
- Likely to Leave

### AI Injury Prevention

Suggest:

- Warm-up
- Stretching
- Recovery

## 5. Membership Flow

1. Admin creates membership.
2. Admin assigns trainer.
3. Member is registered.
4. Member makes payment.
5. Membership is activated.
6. Workout is assigned.
7. Diet is assigned.
8. Attendance starts.
9. Membership renewal reminder is sent.
10. Member renews or membership expires.

## 6. Suggested Database Tables

- Users
- Roles
- Members
- Trainers
- MembershipPlans
- MemberMembership
- Payments
- Attendance
- WorkoutPlans
- WorkoutAssignments
- DietPlans
- ProgressTracking
- Equipment
- Announcements
- Notifications
- Invoices
- Feedback
- ExerciseLibrary
- FoodLibrary

## 7. Implementation Notes

- Existing dashboard code should remain intact unless a future implementation task explicitly asks to modify it.
- These requirements can be implemented incrementally by role: Super Admin first, then Trainer, then Member.
- AI features should be added as separate modules/services so normal gym operations continue working even if AI services are unavailable.
