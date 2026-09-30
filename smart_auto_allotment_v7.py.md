"""  
BLW Varanasi \- Smart Accommodation Auto-Allotment Engine v7.0  
\============================================================  
An advanced, multi-objective, probabilistic room allocation engine  
for Officers Guest House (OGH) and Officers Rest House (ORH).

New Features in v7.0 (Calendar, Holiday, Peak-Season & Long-Stay Surge Awareness):  
1\. Calendar & Seasonal Peak Surge Engine:  
   \- Tracks Gazetted Holidays, Long Weekends, Varanasi Festival Peaks  
     (Dev Deepawali, Mahashivratri, Chhath, Dussehra), and GM Inspection weeks.  
2\. Long-Stay Surge Collision Penalty:  
   \- Penalizes long non-duty visits that straddle upcoming weekends or holiday  
     surges, preventing them from locking down rooms needed by arriving VIPs.  
3\. Proximity-Sensitive Dynamic Vacancy Preservation:  
   \- Automatically inflates Poisson protection quotas for upcoming weekends and  
     holidays (within next 3-7 days), ensuring sufficient rooms remain vacant.  
4\. Fully Configurable Settings Tab:  
   \- All calendar events, surge multipliers, weightages, and equation constants  
     are editable via the Settings configuration.  
5\. 3-Tier Allocation Directive Dropdown (MUST\_ALLOT, SHOULD\_ALLOT, NORMAL\_ALLOT).  
6\. Multi-Option Partial Allotment Engine (Less Rooms, Less Duration, Split Stays, ORH).  
"""

import math  
from datetime import datetime, date, timedelta  
from typing import List, Dict, Any, Optional, Tuple

ROOM\_INVENTORY: List\[Dict\[str, Any\]\] \= \[  
    {"id": "01", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 13},  
    {"id": "02", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 13},  
    {"id": "03", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 13},  
    {"id": "04", "building": "OGH", "type": "4-Bedded", "floor": "Ground", "beds": 4, "tier": "Ground\_Floor", "min\_level": 13},  
    {"id": "05", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 13},  
    {"id": "06", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 13},  
    {"id": "07", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 13},  
    {"id": "08", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 14},  
    {"id": "09", "building": "OGH", "type": "VIP",      "floor": "Ground", "beds": 2, "tier": "VIP",          "min\_level": 15},  
    {"id": "10", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 14},  
    {"id": "11", "building": "OGH", "type": "Standard", "floor": "Ground", "beds": 2, "tier": "Ground\_Floor", "min\_level": 14},  
    {"id": "12", "building": "OGH", "type": "VIP",      "floor": "Ground", "beds": 2, "tier": "VIP",          "min\_level": 15},  
    {"id": "13", "building": "OGH", "type": "VVIP",     "floor": "Ground", "beds": 2, "tier": "VVIP",         "min\_level": 17, "note": "GM / Board / Minister"},  
    {"id": "14A","building": "OGH", "type": "Semi-VIP", "floor": "First",  "beds": 2, "tier": "VIP",          "min\_level": 14},  
    {"id": "14B","building": "OGH", "type": "4-Bedded", "floor": "First",  "beds": 4, "tier": "Standard",     "min\_level": 13},  
    {"id": "15", "building": "OGH", "type": "4-Bedded", "floor": "First",  "beds": 4, "tier": "Standard",     "min\_level": 13},  
    {"id": "16", "building": "OGH", "type": "Normal",   "floor": "First",  "beds": 2, "tier": "Standard",     "min\_level": 13},  
    {"id": "17", "building": "OGH", "type": "Normal",   "floor": "First",  "beds": 2, "tier": "Standard",     "min\_level": 13},  
    {"id": "18", "building": "OGH", "type": "Normal",   "floor": "First",  "beds": 2, "tier": "Standard",     "min\_level": 13},  
    {"id": "19", "building": "OGH", "type": "4-Bedded", "floor": "First",  "beds": 4, "tier": "Standard",     "min\_level": 13},  
    {"id": "20", "building": "OGH", "type": "Normal",   "floor": "First",  "beds": 2, "tier": "Standard",     "min\_level": 13},  
    {"id": "21", "building": "OGH", "type": "Normal",   "floor": "First",  "beds": 2, "tier": "Standard",     "min\_level": 13},  
    {"id": "22", "building": "OGH", "type": "Normal",   "floor": "First",  "beds": 2, "tier": "Standard",     "min\_level": 13},  
    {"id": "23", "building": "OGH", "type": "4-Bedded", "floor": "First",  "beds": 4, "tier": "Standard",     "min\_level": 13},  
    {"id": "24", "building": "OGH", "type": "4-Bedded", "floor": "First",  "beds": 4, "tier": "Standard",     "min\_level": 13},  
    {"id": "25", "building": "OGH", "type": "VIP 4-Bedded", "floor": "First", "beds": 4, "tier": "VIP",      "min\_level": 15},  
    {"id": "26", "building": "OGH", "type": "4-Bedded", "floor": "First",  "beds": 4, "tier": "Standard",     "min\_level": 13},  
    {"id": "27", "building": "OGH", "type": "Standard", "floor": "First",  "beds": 2, "tier": "Standard",     "min\_level": 13},  
    {"id": "28", "building": "OGH", "type": "4-Bedded", "floor": "First",  "beds": 4, "tier": "Standard",     "min\_level": 13},  
    {"id": "101", "building": "ORH", "type": "2-Bedded", "floor": "First",   "beds": 2, "tier": "ORH\_Buffer",  "min\_level": 11},  
    {"id": "107", "building": "ORH", "type": "4-Bedded", "floor": "First",   "beds": 4, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "108", "building": "ORH", "type": "4-Bedded", "floor": "First",   "beds": 4, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "109", "building": "ORH", "type": "4-Bedded", "floor": "First",   "beds": 4, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "110", "building": "ORH", "type": "4-Bedded", "floor": "First",   "beds": 4, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "203", "building": "ORH", "type": "4-Bedded", "floor": "Second",  "beds": 4, "tier": "ORH\_Buffer",  "min\_level": 11},  
    {"id": "T1",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "T2",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "T3",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "T4",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "T5",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "T6",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "T7",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
    {"id": "T8",  "building": "ORH", "type": "2-Bedded", "floor": "Transit", "beds": 2, "tier": "ORH\_Transit", "min\_level": 11},  
\]

DEFAULT\_SETTINGS: Dict\[str, Any\] \= {  
    "directive\_must\_allot\_score": 1000.0,  
    "directive\_should\_allot\_boost": 350.0,  
    "level\_multiplier": 12.0,  
    "apex\_bonus\_l17": 80.0,  
    "apex\_bonus\_l16": 50.0,  
    "apex\_bonus\_l15": 35.0,  
    "apex\_bonus\_l14": 20.0,  
    "apex\_bonus\_l12": 10.0,  
    "purpose\_duty\_score": 40.0,  
    "purpose\_medical\_score": 30.0,  
    "purpose\_personal\_score": 15.0,  
    "purpose\_guest\_score": 5.0,  
    "status\_mult\_serving": 1.10,  
    "status\_mult\_retired": 1.00,  
    "status\_mult\_guest": 0.80,  
    "duration\_bonus\_le\_1d": 25.0,  
    "duration\_bonus\_le\_2d": 18.0,  
    "duration\_bonus\_le\_3d": 10.0,  
    "duration\_penalty\_gt\_7d\_personal": \-20.0,  
    "duration\_penalty\_gt\_7d\_duty": \-5.0,  
    "demand\_bonus\_le\_2beds": 20.0,  
    "demand\_bonus\_le\_4beds": 5.0,  
    "demand\_penalty\_gt\_4beds": \-15.0,  
    "reference\_bonus\_apex": 25.0,  
    "reference\_bonus\_senior": 15.0,  
    "reference\_bonus\_general": 5.0,  
    "dow\_mult\_friday": 1.45,  
    "dow\_mult\_sunday": 1.20,  
    "dow\_mult\_saturday": 1.15,  
    "dow\_mult\_weekday": 0.85,  
    "surge\_overlap\_penalty\_rate": 20.0,  
    "surge\_long\_stay\_threshold\_days": 3.0,  
    "peak\_horizon\_max\_days": 7.0,  
    "calendar\_events": \[  
        {"name": "Gandhi Jayanti (Long Weekend)", "start": "2026-10-02", "end": "2026-10-04", "surge\_factor": 1.6},  
        {"name": "Dussehra / Vijayadashami", "start": "2026-10-19", "end": "2026-10-21", "surge\_factor": 1.7},  
        {"name": "Diwali & Dev Deepawali Peak", "start": "2026-11-08", "end": "2026-11-25", "surge\_factor": 2.2},  
        {"name": "Chhath Puja", "start": "2026-11-15", "end": "2026-11-18", "surge\_factor": 1.8},  
        {"name": "GM Annual Inspection Week", "start": "2026-12-10", "end": "2026-12-16", "surge\_factor": 2.5},  
        {"name": "Christmas & New Year Peak", "start": "2026-12-24", "end": "2027-01-02", "surge\_factor": 2.0}  
    \],  
    "fitness\_slack\_multiplier": 15.0,  
    "fitness\_gf\_bonus\_senior": 40.0,  
    "fitness\_gf\_penalty\_senior": \-20.0,  
    "fitness\_upper\_bonus\_junior": 25.0,  
    "fitness\_gf\_penalty\_junior": \-15.0,  
    "fitness\_group\_4bed\_bonus": 50.0,  
    "fitness\_group\_2bed\_penalty": \-20.0,  
    "fitness\_single\_2bed\_bonus": 30.0,  
    "fitness\_single\_4bed\_penalty": \-40.0,  
    "prob\_target\_service\_level": 0.85,  
    "lambda\_vvip": 0.05,  
    "lambda\_vip": 0.15,  
    "lambda\_gf": 0.35,  
    "lambda\_standard": 0.20,  
    "buffer\_standard\_hours": 2.0,  
    "buffer\_vip\_hours": 4.0  
}

def poisson\_cdf(k: int, mu: float) \-\> float:  
    if mu \<= 0: return 1.0  
    s \= 0.0  
    for i in range(k \+ 1):  
        s \+= (mu \*\* i) \* math.exp(-mu) / math.factorial(i)  
    return s

def calculate\_date\_surge\_factor(dt: datetime, settings: Dict\[str, Any\]) \-\> Tuple\[float, List\[str\]\]:  
    factors, reasons \= \[\], \[\]  
    d\_str, dow \= dt.strftime("%Y-%m-%d"), dt.strftime("%A")  
    if dow \== "Friday": factors.append(settings.get("dow\_mult\_friday", 1.45)); reasons.append("Friday Peak")  
    elif dow \== "Saturday": factors.append(settings.get("dow\_mult\_saturday", 1.15)); reasons.append("Saturday Weekend")  
    elif dow \== "Sunday": factors.append(settings.get("dow\_mult\_sunday", 1.20)); reasons.append("Sunday Weekend")  
    else: factors.append(settings.get("dow\_mult\_weekday", 0.85))  
    for ev in settings.get("calendar\_events", \[\]):  
        if ev\["start"\] \<= d\_str \<= ev\["end"\]:  
            factors.append(ev.get("surge\_factor", 1.5))  
            reasons.append(ev\["name"\])  
    composite \= max(factors)  
    if len(factors) \> 1 and "Weekend" in reasons\[0\]:  
        composite \= factors\[0\] \* factors\[1\] \* 0.85  
    return round(composite, 2), reasons

def calculate\_stay\_calendar\_metrics(start\_dt: datetime, end\_dt: datetime, settings: Dict\[str, Any\]) \-\> Tuple\[float, int, List\[str\]\]:  
    curr, peak\_count, total\_surge\_excess, all\_reasons \= start\_dt, 0, 0.0, set()  
    while curr \< end\_dt:  
        factor, reasons \= calculate\_date\_surge\_factor(curr, settings)  
        if factor \> 1.1:  
            peak\_count \+= 1  
            total\_surge\_excess \+= (factor \- 1.0)  
            all\_reasons.update(reasons)  
        curr \+= timedelta(days=1)  
    return round(total\_surge\_excess, 2), peak\_count, list(all\_reasons)

def calculate\_preserved\_quota\_v7(tier: str, start\_dt: datetime, current\_time: datetime, settings: Dict\[str, Any\]) \-\> int:  
    lambdas \= {"VVIP": settings\["lambda\_vvip"\], "VIP": settings\["lambda\_vip"\], "Ground\_Floor": settings\["lambda\_gf"\], "Standard": settings\["lambda\_standard"\]}  
    base\_lambda \= lambdas.get(tier, 0.15)  
    lead\_time\_days \= max(0.0, (start\_dt \- current\_time).total\_seconds() / 86400.0)  
    surge\_mult, \_ \= calculate\_date\_surge\_factor(start\_dt, settings)  
    horizon \= min(max(lead\_time\_days, 0.5), settings.get("peak\_horizon\_max\_days", 7.0))  
    mu \= base\_lambda \* surge\_mult \* horizon  
    target\_sl \= settings\["prob\_target\_service\_level"\]  
    for k in range(0, 10):  
        if poisson\_cdf(k, mu) \>= target\_sl:  
            return k  
    return 2

def calculate\_importance\_score\_v7(req: Dict\[str, Any\], settings: Dict\[str, Any\]) \-\> Tuple\[float, Dict\[str, float\]\]:  
    breakdown \= {}  
    directive \= (req.get("directive") or ("MUST\_ALLOT" if req.get("must\_allot") else "NORMAL\_ALLOT")).upper().strip()  
    if directive \== "MUST\_ALLOT":  
        breakdown\["directive\_must\_allot"\] \= settings\["directive\_must\_allot\_score"\]  
        return settings\["directive\_must\_allot\_score"\], breakdown  
          
    level \= int(req.get("level", 11))  
    level\_base \= level \* settings\["level\_multiplier"\]  
    if level \>= 17: apex \= settings\["apex\_bonus\_l17"\]  
    elif level \== 16: apex \= settings\["apex\_bonus\_l16"\]  
    elif level \== 15: apex \= settings\["apex\_bonus\_l15"\]  
    elif level \== 14: apex \= settings\["apex\_bonus\_l14"\]  
    elif level \>= 12: apex \= settings\["apex\_bonus\_l12"\]  
    else: apex \= 0.0  
    breakdown\["seniority\_score"\] \= level\_base \+ apex  
      
    purpose \= (req.get("purpose") or req.get("category") or "Guest").strip().title()  
    if purpose in \["Duty", "Official", "On Duty"\]: p\_score \= settings\["purpose\_duty\_score"\]  
    elif purpose in \["Medical", "Emergency"\]: p\_score \= settings\["purpose\_medical\_score"\]  
    elif purpose in \["Personal", "Private"\]: p\_score \= settings\["purpose\_personal\_score"\]  
    else: p\_score \= settings\["purpose\_guest\_score"\]  
    breakdown\["purpose\_score"\] \= p\_score  
      
    status \= (req.get("status") or "Serving").strip().title()  
    s\_mult \= settings\["status\_mult\_serving"\] if status \== "Serving" else (settings\["status\_mult\_retired"\] if status \== "Retired" else settings\["status\_mult\_guest"\])  
    subtotal \= (level\_base \+ apex \+ p\_score) \* s\_mult  
    breakdown\["status\_adjusted\_subtotal"\] \= subtotal  
      
    dur \= req.get("duration\_days", 2.0)  
    if dur \<= 1.0: d\_bonus \= settings\["duration\_bonus\_le\_1d"\]  
    elif dur \<= 2.0: d\_bonus \= settings\["duration\_bonus\_le\_2d"\]  
    elif dur \<= 3.0: d\_bonus \= settings\["duration\_bonus\_le\_3d"\]  
    elif dur \> 7.0: d\_bonus \= settings\["duration\_penalty\_gt\_7d\_duty"\] if purpose \== "Duty" else settings\["duration\_penalty\_gt\_7d\_personal"\]  
    else: d\_bonus \= 0.0  
    breakdown\["duration\_bonus"\] \= d\_bonus  
      
    beds \= int(req.get("beds", 2))  
    if beds \<= 2: b\_bonus \= settings\["demand\_bonus\_le\_2beds"\]  
    elif beds \<= 4: b\_bonus \= settings\["demand\_bonus\_le\_4beds"\]  
    else: b\_bonus \= settings\["demand\_penalty\_gt\_4beds"\]  
    breakdown\["demand\_bonus"\] \= b\_bonus  
      
    ref \= (req.get("reference") or "").lower()  
    if any(k in ref for k in \["gm", "mr", "minister", "crb", "board"\]): r\_bonus \= settings\["reference\_bonus\_apex"\]  
    elif any(k in ref for k in \["cvo", "pce", "pcee", "pcme", "pfa", "drm"\]): r\_bonus \= settings\["reference\_bonus\_senior"\]  
    elif len(ref) \> 2: r\_bonus \= settings\["reference\_bonus\_general"\]  
    else: r\_bonus \= 0.0  
    breakdown\["reference\_bonus"\] \= r\_bonus  
      
    surge\_penalty \= 0.0  
    if purpose \!= "Duty" and dur \> settings.get("surge\_long\_stay\_threshold\_days", 3.0):  
        excess\_surge, peak\_days, \_ \= calculate\_stay\_calendar\_metrics(req\["start\_dt"\], req\["end\_dt"\], settings)  
        if peak\_days \> 0:  
            surge\_penalty \= \-1.0 \* peak\_days \* settings.get("surge\_overlap\_penalty\_rate", 20.0)  
    breakdown\["surge\_collision\_penalty"\] \= surge\_penalty  
      
    total \= (level\_base \+ apex \+ p\_score) \* s\_mult \+ d\_bonus \+ b\_bonus \+ r\_bonus \+ surge\_penalty  
    if directive \== "SHOULD\_ALLOT":  
        total \+= settings\["directive\_should\_allot\_boost"\]  
        breakdown\["directive\_should\_allot\_boost"\] \= settings\["directive\_should\_allot\_boost"\]  
    return max(10.0, round(total, 2)), breakdown

def generate\_partial\_allotment\_options\_v7(req: Dict\[str, Any\], rooms: List\[Dict\[str, Any\]\], settings: Dict\[str, Any\]) \-\> Dict\[str, Any\]:  
    req\_start, req\_end \= req\["start\_dt"\], req\["end\_dt"\]  
    total\_requested\_days, beds\_needed \= req\["duration\_days"\], req\["beds"\]  
    default\_buf, vip\_buf \= settings\["buffer\_standard\_hours"\], settings\["buffer\_vip\_hours"\]  
    options \= {"less\_capacity": \[\], "less\_duration": \[\], "split\_stay": \[\]}  
      
    for r in rooms:  
        buf\_h \= vip\_buf if "VIP" in r\["type"\] else default\_buf  
        buf \= timedelta(hours=buf\_h)  
        bookings \= r.get("bookings", \[\])  
          
        full\_free \= all(not (req\_start \< (datetime.fromisoformat(b\["checkOut"\]) \+ buf) and (req\_end \+ buf) \> datetime.fromisoformat(b\["checkIn"\])) for b in bookings)  
        if full\_free and r\["beds"\] \< beds\_needed:  
            options\["less\_capacity"\].append({  
                "roomId": r\["id"\], "building": r\["building"\], "type": r\["type"\], "floor": r\["floor"\],  
                "availableBeds": r\["beds"\], "requestedBeds": beds\_needed,  
                "dates": f"{req\_start.strftime('%d-%b %H:%M')} to {req\_end.strftime('%d-%b %H:%M')}",  
                "description": f"Allot {r\['beds'\]} beds in {r\['building'\]}-{r\['id'\]} (deficit: {beds\_needed \- r\['beds'\]} beds waitlisted)."  
            })  
              
        curr, free\_blocks, in\_block, block\_start \= req\_start, \[\], False, None  
        step \= timedelta(hours=6)  
        while curr \< req\_end:  
            sub\_free \= all(not (curr \< (datetime.fromisoformat(b\["checkOut"\]) \+ buf) and (curr \+ step) \> datetime.fromisoformat(b\["checkIn"\])) for b in bookings)  
            if sub\_free:  
                if not in\_block: in\_block, block\_start \= True, curr  
            else:  
                if in\_block: in\_block \= False; free\_blocks.append((block\_start, curr))  
            curr \+= step  
        if in\_block: free\_blocks.append((block\_start, curr))  
          
        for s\_blk, e\_blk in free\_blocks:  
            blk\_days \= (e\_blk \- s\_blk).total\_seconds() / 86400.0  
            if blk\_days \>= 1.0 and (s\_blk \> req\_start or e\_blk \< req\_end):  
                pct \= round((blk\_days / total\_requested\_days) \* 100, 1\)  
                options\["less\_duration"\].append({  
                    "roomId": r\["id"\], "building": r\["building"\], "type": r\["type"\], "floor": r\["floor"\],  
                    "availableDates": f"{s\_blk.strftime('%d-%b %H:%M')} to {e\_blk.strftime('%d-%b %H:%M')}",  
                    "coveredDays": round(blk\_days, 1), "coveragePct": pct,  
                    "description": f"Allot {r\['building'\]}-{r\['id'\]} for {round(blk\_days, 1)} of {total\_requested\_days} requested days ({pct}% coverage)."  
                })  
                  
    mid\_points \= \[req\_start \+ timedelta(days=d) for d in range(1, int(total\_requested\_days))\]  
    for mid in mid\_points:  
        r1\_candidates, r2\_candidates \= \[\], \[\]  
        for r in rooms:  
            buf\_h \= vip\_buf if "VIP" in r\["type"\] else default\_buf  
            buf \= timedelta(hours=buf\_h)  
            bookings \= r.get("bookings", \[\])  
            if all(not (req\_start \< (datetime.fromisoformat(b\["checkOut"\]) \+ buf) and (mid \+ buf) \> datetime.fromisoformat(b\["checkIn"\])) for b in bookings): r1\_candidates.append(r)  
            if all(not (mid \< (datetime.fromisoformat(b\["checkOut"\]) \+ buf) and (req\_end \+ buf) \> datetime.fromisoformat(b\["checkIn"\])) for b in bookings): r2\_candidates.append(r)  
        for r1 in r1\_candidates:  
            for r2 in r2\_candidates:  
                if r1\["id"\] \!= r2\["id"\] or r1\["building"\] \!= r2\["building"\]:  
                    options\["split\_stay"\].append({  
                        "firstLeg": f"{r1\['building'\]}-{r1\['id'\]} ({req\_start.strftime('%d-%b')} to {mid.strftime('%d-%b')})",  
                        "secondLeg": f"{r2\['building'\]}-{r2\['id'\]} ({mid.strftime('%d-%b')} to {req\_end.strftime('%d-%b')})",  
                        "switchDate": mid.strftime('%Y-%m-%d 12:00'),  
                        "description": f"Split Stay: {r1\['building'\]}-{r1\['id'\]} until {mid.strftime('%d-%b')}, then switch to {r2\['building'\]}-{r2\['id'\]}."  
                    })  
                    break  
            if options\["split\_stay"\]: break  
        if options\["split\_stay"\]: break  
          
    options\["less\_duration"\].sort(key=lambda x: x\["coveredDays"\], reverse=True)  
    options\["less\_duration"\] \= options\["less\_duration"\]\[:3\]  
    options\["less\_capacity"\] \= options\["less\_capacity"\]\[:2\]  
    options\["split\_stay"\] \= options\["split\_stay"\]\[:2\]  
    return options

def run\_smart\_auto\_allotment\_v7(requests: List\[Dict\[str, Any\]\], rooms: Optional\[List\[Dict\[str, Any\]\]\] \= None, current\_time: Optional\[datetime\] \= None, settings: Optional\[Dict\[str, Any\]\] \= None) \-\> Dict\[str, Any\]:  
    active\_settings \= dict(DEFAULT\_SETTINGS)  
    if settings: active\_settings.update(settings)  
    if rooms is None: rooms \= \[dict(r, bookings=\[\]) for r in ROOM\_INVENTORY\]  
    else: rooms \= \[dict(r, bookings=\[dict(b) for b in r.get("bookings", \[\])\]) for r in rooms\]  
    if current\_time is None: current\_time \= datetime(2026, 9, 29, 12, 0\)  
      
    processed\_requests \= \[\]  
    for idx, r in enumerate(requests):  
        req \= dict(r)  
        req\["id"\] \= req.get("id") or f"REQ\_{idx+1:03d}"  
        req\_start, req\_end \= datetime.fromisoformat(req\["from"\]) if isinstance(req\["from"\], str) else req\["from"\], datetime.fromisoformat(req\["to"\]) if isinstance(req\["to"\], str) else req\["to"\]  
        duration \= max(0.2, (req\_end \- req\_start).total\_seconds() / 86400.0)  
        req\["start\_dt"\], req\["end\_dt"\], req\["duration\_days"\] \= req\_start, req\_end, round(duration, 2\)  
        req\["level"\], req\["beds"\] \= int(req.get("level", 11)), int(req.get("beds", 2))  
        directive \= (req.get("directive") or ("MUST\_ALLOT" if req.get("must\_allot") else "NORMAL\_ALLOT")).upper().strip()  
        req\["directive"\] \= directive  
        excess\_surge, peak\_days, peak\_reasons \= calculate\_stay\_calendar\_metrics(req\_start, req\_end, active\_settings)  
        req\["calendar\_peak\_days"\], req\["calendar\_reasons"\] \= peak\_days, peak\_reasons  
        score, breakdown \= calculate\_importance\_score\_v7(req, active\_settings)  
        req\["importance\_score"\], req\["score\_breakdown"\] \= score, breakdown  
        processed\_requests.append(req)  
          
    processed\_requests.sort(key=lambda x: x\["importance\_score"\], reverse=True)  
    allotment\_results \= \[\]  
      
    for req in processed\_requests:  
        req\_start, req\_end, level, beds\_needed, directive \= req\["start\_dt"\], req\["end\_dt"\], req\["level"\], req\["beds"\], req\["directive"\]  
        tier\_quotas \= {  
            "VVIP": calculate\_preserved\_quota\_v7("VVIP", req\_start, current\_time, active\_settings),  
            "VIP": calculate\_preserved\_quota\_v7("VIP", req\_start, current\_time, active\_settings),  
            "Ground\_Floor": calculate\_preserved\_quota\_v7("Ground\_Floor", req\_start, current\_time, active\_settings),  
        }  
          
        candidate\_rooms \= \[\]  
        for r in rooms:  
            r\_tier \= r.get("tier", "Standard")  
            buf\_h \= active\_settings\["buffer\_vip\_hours"\] if "VIP" in r\["type"\] else active\_settings\["buffer\_standard\_hours"\]  
            buf \= timedelta(hours=buf\_h)  
            if directive \!= "MUST\_ALLOT":  
                if r\["building"\] \== "OGH" and r\["id"\] \== "13" and level \< 17: continue  
                if level \< r.get("min\_level", 11): continue  
                vacant\_in\_tier \= sum(1 for tr in rooms if tr.get("tier") \== r\_tier and all(not (req\_start \< (datetime.fromisoformat(b\["checkOut"\]) \+ buf) and (req\_end \+ buf) \> datetime.fromisoformat(b\["checkIn"\])) for b in tr.get("bookings", \[\])))  
                preserved\_quota \= tier\_quotas.get(r\_tier, 0\)  
                cutoff \= 200.0 if directive \== "SHOULD\_ALLOT" else 250.0  
                if vacant\_in\_tier \<= preserved\_quota and req\["importance\_score"\] \< cutoff: continue  
            candidate\_rooms.append(r)  
              
        def room\_fitness(r: Dict\[str, Any\]) \-\> float:  
            fit \= (r\["min\_level"\] \- level) \* active\_settings\["fitness\_slack\_multiplier"\]  
            prefer\_gf \= (req.get("status") \== "Retired" or level \>= 15 or req.get("gfPref", False))  
            is\_gf \= (r\["floor"\] \== "Ground")  
            if prefer\_gf: fit \+= active\_settings\["fitness\_gf\_bonus\_senior"\] if is\_gf else active\_settings\["fitness\_gf\_penalty\_senior"\]  
            else: fit \+= active\_settings\["fitness\_upper\_bonus\_junior"\] if not is\_gf else active\_settings\["fitness\_gf\_penalty\_junior"\]  
            if beds\_needed \> 2: fit \+= active\_settings\["fitness\_group\_4bed\_bonus"\] if r\["beds"\] \>= 4 else active\_settings\["fitness\_group\_2bed\_penalty"\]  
            else: fit \+= active\_settings\["fitness\_single\_2bed\_bonus"\] if r\["beds"\] \== 2 else active\_settings\["fitness\_single\_4bed\_penalty"\]  
            return fit  
              
        candidate\_rooms.sort(key=room\_fitness, reverse=True)  
        allocated\_rooms, remaining\_beds, reasons \= \[\], beds\_needed, \[\]  
        for room in candidate\_rooms:  
            if remaining\_beds \<= 0: break  
            buf\_h \= active\_settings\["buffer\_vip\_hours"\] if ("VIP" in room\["type"\] or room\["id"\] \== "13") else active\_settings\["buffer\_standard\_hours"\]  
            buf \= timedelta(hours=buf\_h)  
            is\_vacant \= all(not (req\_start \< (datetime.fromisoformat(b\["checkOut"\]) \+ buf) and (req\_end \+ buf) \> datetime.fromisoformat(b\["checkIn"\])) for b in room\["bookings"\])  
            if is\_vacant:  
                room\_cap \= room\["beds"\]  
                booking\_record \= {  
                    "bookingId": f"AUTO\_{int(datetime.now().timestamp()\*1000)}\_{room\['id'\]}",  
                    "roomId": room\["id"\], "building": room\["building"\], "guestName": req.get("guestName", f"Officer L{level}"),  
                    "category": req.get("purpose", "On Duty"), "checkIn": req\_start.isoformat(), "checkOut": req\_end.isoformat(),  
                    "allottedBeds": min(remaining\_beds, room\_cap), "bufferHours": buf\_h  
                }  
                room\["bookings"\].append(booking\_record)  
                allocated\_rooms.append({"roomId": room\["id"\], "building": room\["building"\], "type": room\["type"\], "floor": room\["floor"\], "beds": room\_cap, "bookingRecord": booking\_record})  
                remaining\_beds \-= room\_cap  
                reasons.append(f"Allotted {room\['building'\]}-{room\['id'\]} ({room\['type'\]}, {room\['floor'\]} Floor) with {buf\_h}h buffer.")  
                  
        fallback\_options \= None  
        if len(allocated\_rooms) \> 0:  
            status \= "Fully Allotted" if remaining\_beds \<= 0 else f"Partially Allotted ({beds\_needed \- remaining\_beds}/{beds\_needed} beds)"  
            if remaining\_beds \> 0: fallback\_options \= generate\_partial\_allotment\_options\_v7(req, rooms, active\_settings)  
        else:  
            status \= "Waitlisted / Denied"  
            reasons.append(f"No room free satisfying quotas (Preserved {tier\_quotas\['VIP'\]} VIP & {tier\_quotas\['Ground\_Floor'\]} GF suites for peak surge: {', '.join(req\['calendar\_reasons'\]) or 'Weekend'}).")  
            fallback\_options \= generate\_partial\_allotment\_options\_v7(req, rooms, active\_settings)  
              
        allotment\_results.append({  
            "requestId": req\["id"\], "guestName": req.get("guestName", "Unknown"), "level": level, "purpose": req.get("purpose", "Duty"),  
            "directive": directive, "importanceScore": req\["importance\_score"\], "requestedBeds": beds\_needed,  
            "stayDates": f"{req\_start.strftime('%Y-%m-%d %H:%M')} to {req\_end.strftime('%Y-%m-%d %H:%M')}",  
            "peakDaysCrossed": req\["calendar\_peak\_days"\], "peakEvents": req\["calendar\_reasons"\],  
            "status": status, "allottedRooms": allocated\_rooms, "reasons": reasons, "partialAllotmentOptions": fallback\_options  
        })  
          
    return {"summary": {"totalRequests": len(requests), "fullyAllotted": sum(1 for r in allotment\_results if r\["status"\] \== "Fully Allotted"), "partiallyAllotted": sum(1 for r in allotment\_results if "Partially" in r\["status"\]), "waitlisted": sum(1 for r in allotment\_results if r\["status"\] \== "Waitlisted / Denied")}, "allotments": allotment\_results, "activeSettings": active\_settings, "updatedRooms": rooms}  
