The auto room allotment engine has been upgraded to **v7.0** to incorporate **Calendar, Holiday, Weekend, and Peak-Season Surge Awareness**, with special handling for **long stays that overlap high-demand periods**.  
The updated implementation is saved in Google Drive:  
👉 [**smart\_auto\_allotment\_v7.py**](https://docs.google.com/document/d/1ClXVYV648EQ65izjrRpswozNJOh9xtBHkmdu5GU3B7A/edit)

### **Core Problem Solved**

In railway guest houses (especially OGH in Varanasi / BLW), long-stay personal or casual bookings (e.g., 4 to 10 days) frequently overlap with **upcoming weekends (Friday–Sunday)**, **gazetted holidays**, or **major seasonal festivals** (such as Dev Deepawali, Dussehra, Chhath Puja, or GM Annual Inspection Week).  
When low-priority bookings occupy rooms across these high-demand dates:

> 1. They cause a massive **opportunity cost**, locking down prime Ground Floor and VIP suites days in advance.  
> 2. Sudden, short-notice VIP, Board Member, and PHOD inspection arrivals over the weekend get denied or face room shortages.

### **Key Algorithmic Additions in v7.0**

\[ Request Check-In & Check-Out Dates \]  
                   │  
                   ▼  
┌─────────────────────────────────────────────────────┐  
│ 1\. Calendar Surge & Event Detector                  │  
│    \- Friday/Sunday Weekend Inflows                  │  
│    \- Long Weekends (e.g. Gandhi Jayanti Oct 2-4)    │  
│    \- Festival Peaks (Dev Deepawali, Chhath, etc.)   │  
│    \- GM Annual Inspection Windows                   │  
└─────────────────────────────────────────────────────┘  
                   │  
         ┌─────────┴─────────┐  
         ▼                   ▼  
┌──────────────────┐ ┌──────────────────────────────────────────┐  
│ 2\. Long-Stay     │ │ 3\. Proximity-Sensitive Quota Inflation   │  
│    Surge Penalty │ │    \- If surge is within next 3–7 days:   │  
│    \- Non-duty    │ │      Poisson arrival rate λ is scaled up │  
│      stays \>3d   │ │    \- Preserved VIP & GF room safety      │  
│      docked pts  │ │      stock automatically increases       │  
└──────────────────┘ └──────────────────────────────────────────┘  
         │                   │  
         └─────────┬─────────┘  
                   ▼  
┌─────────────────────────────────────────────────────┐  
│ 4\. Intelligent Routing Decision                     │  
│    \- High-ranking Duty: Gets OGH VIP/GF Suite       │  
│    \- Long Personal Stay: Guided to ORH Transit Room │  
│      or offered Partial / Split-Stay alternatives   │  
└─────────────────────────────────────────────────────┘

### **1\. Calendar Event & Seasonal Peak Registry (Configurable via Settings Tab)**

The engine introduces a calendar registry that can be edited directly from the Settings tab:

Python  
"calendar\_events": \[  
    {"name": "Gandhi Jayanti (Long Weekend)",     "start": "2026-10-02", "end": "2026-10-04", "surge\_factor": 1.6},  
    {"name": "Dussehra / Vijayadashami",          "start": "2026-10-19", "end": "2026-10-21", "surge\_factor": 1.7},  
    {"name": "Diwali & Dev Deepawali Peak",       "start": "2026-11-08", "end": "2026-11-25", "surge\_factor": 2.2},  
    {"name": "Chhath Puja",                       "start": "2026-11-15", "end": "2026-11-18", "surge\_factor": 1.8},  
    {"name": "GM Annual Inspection Week",         "start": "2026-12-10", "end": "2026-12-16", "surge\_factor": 2.5},  
    {"name": "Christmas & New Year Peak",         "start": "2026-12-24", "end": "2027-01-02", "surge\_factor": 2.0}  
\]

#### **Daily Surge Multiplier \$M\_{\\text{surge}}(t)\$**

For any date \$t\$, the system computes an effective surge multiplier combining day-of-week and scheduled calendar events:

* **Friday (Peak Inflow):** \$1.45\\times\$  
* **Sunday (Turnaround/Departure):** \$1.20\\times\$  
* **Saturday (Weekend):** \$1.15\\times\$  
* **Midweek (Tuesday–Thursday):** \$0.85\\times\$ (Baseline)  
* **Holiday on Weekend (Synergistic Surge):** When a holiday falls on a Friday or Monday (long weekend), the surge multiplier scales up to \$1.6\\times \- 2.5\\times\$.

### **2\. Long-Stay Surge Collision Penalty (\$P\_{\\text{surge\\\_collision}}\$)**

To protect room inventory across peak dates:

> 1. **Applicability:** Applies to requests where \$\\text{duration} \> \\text{surge\\\_long\\\_stay\\\_threshold\\\_days}\$ (default: **3.0 days**) and visit purpose is **NOT Official Duty**.  
> 2. **Formula:**  
>    \$\$P\_{\\text{surge\\\_collision}} \= \-1.0 \\times \\text{PeakDaysCrossed} \\times \\text{surge\\\_overlap\\\_penalty\\\_rate}\$\$  
   * surge\_overlap\_penalty\_rate: Default **20.0 points** per peak day crossed.  
> 3. **Operational Impact:**  
   * A 5-day personal stay from Thursday to Tuesday crossing Friday, Saturday, and Sunday incurs a **\$-60.0\$ point penalty**.  
   * This score reduction ensures that casual, multi-day stays do not squat on high-demand OGH inventory.  
   * Instead of outright rejecting the applicant, the engine automatically routes them to **Officers Rest House (ORH)** or offers **Partial Allotment Options** (e.g., confirming midweek nights while releasing weekend nights for VIPs).

### **3\. Proximity-Sensitive Dynamic Quota Inflation**

When high-demand dates occur in the near future (within the next **3 to 7 days**), the probability of sudden, short-notice VIP arrival surges significantly.  
The Poisson arrival parameter \$\\mu\$ for reserving vacant rooms is dynamically adjusted:

\$\$\\mu \= \\lambda\_{\\text{tier}} \\times M\_{\\text{surge}}(\\text{check\\\_in\\\_date}) \\times \\min(\\text{lead\\\_time}, 7.0)\$\$

#### **Impact on Safety-Stock Preserved Quotas (\$K\_{\\text{tier}}\$):**

| Room Tier | Normal Midweek Horizon | Upcoming Friday / Weekend | Dev Deepawali / GM Inspection Week |
| :---- | :---- | :---- | :---- |
| **OGH Room 13 (VVIP Suite)** | Held for L17+ | Held for L17+ | Held for L17+ |
| **VIP Suites (09, 12, 14A, 25\)** | 1 suite preserved | **2 to 3 suites preserved** | **3 to 4 suites preserved** |
| **Ground Floor Standard Suites** | 1 to 2 rooms preserved | **3 to 4 rooms preserved** | **5 to 6 rooms preserved** |

Any non-duty request whose score falls below the protection cutoff (\$250.0\$ for Normal, \$200.0\$ for Should Allot) is prevented from claiming these preserved rooms.

### **4\. Verification & Simulation Test Run**

In testing the revised engine against an upcoming Gandhi Jayanti long weekend (Oct 1 to Oct 6):

Plaintext  
\================================================================================  
BLW SMART AUTO-ALLOTMENT ENGINE v7.0 \- TEST BENCH  
\================================================================================  
Current Date: 2026-09-29 | Target Window: 2026-10-01 to 2026-10-06 (Gandhi Jayanti Weekend)

1\. \[REQ\_01\] Senior Section Engineer (Level 11, Personal Visit, 5-Day Stay)  
   \- Stay crosses 3 peak days: Friday (Oct 2), Saturday (Oct 3), Sunday (Oct 4\)  
   \- Surge Collision Penalty applied: \-60.0 points (Score adjusted to 121.7)  
   \- Outcome: Allotted ORH-101 (2-Bedded Suite in ORH).  
   \- Benefit: OGH main building remains completely free for arriving inspection officers.

2\. \[REQ\_02\] Member Infrastructure, Railway Board (Level 17, Official Duty, Weekend Inspection)  
   \- Arriving Oct 2 on short notice for 2-day inspection tour  
   \- Score: 386.4 (Dominant seniority \+ Duty \+ Apex bonus)  
   \- Outcome: Fully Allotted to OGH-13 (VVIP Ground Floor Suite).  
\================================================================================

### **Settings Tab Integration**

All new calendar parameters are exposed in DEFAULT\_SETTINGS for easy adjustment in the UI:

* surge\_overlap\_penalty\_rate (\$20.0\$ pts/day)  
* surge\_long\_stay\_threshold\_days (\$3.0\$ days)  
* peak\_horizon\_max\_days (\$7.0\$ days)  
* calendar\_events (Full editable JSON array of dates, names, and surge factors)

![][image1]

smart\_auto\_allotment\_v7.py  Created Sep 29  
Open

[image1]: <data:image/png;base64,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>