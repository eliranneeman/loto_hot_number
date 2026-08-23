# LottoGun

אתר הצעות צירופים ללוטו הישראלי, על בסיס כל הגרלות השיטה הנוכחית (6 מתוך 37 + מספר חזק 1-7, מאז מאי 2011).

## מקורות הנתונים

| מקור | מתי מתעדכן | שימוש |
|------|------------|--------|
| **Firebase Realtime Database** (`/lotto`) | כל לילה ב-00:00 + הרצה ידנית | מקור ראשי |
| **`lottery_results.json`** ב-GitHub | ידני | גיבוי |

### חיסכון במכסת Firebase (חינם)

האתר טוען את ארכיון ההגרלות **פעם אחת לכל ביקור** (טאב בדפדפן):
- הורדה ראשונה מ-Firebase או מ-JSON מקומי
- שמירה ב-`sessionStorage`
- כל שאר הדפים (סטטיסטיקות, תוצאות, צירופים) משתמשים ** באותה קריאה** — בלי הורדה חוזרת

> **Excel (`Lotto.xlsx`) בוטל** — האתר לא משתמש יותר בקבצי Excel.

## עדכון מקומי של JSON (גיבוי)

```bash
python3 scripts/sync_pais_results.py
```

## פריסת Firebase Function

```bash
firebase deploy --only functions,database --force
```

הרצה ידנית לבדיקה:
```
https://europe-west1-loto-hot.cloudfunctions.net/checkLotteryNow
```

## מערכת פרסומות (AdMob מותאם)

מערכת פרסום native משלך — קמפיינים, תמונות, קישורים ובאנר "פרסמו אצלנו".

### ממשק ניהול

```
/admin/ads.html
```

1. ב-Firebase Console → **Authentication** → הפעל **Google** (ו/או Email/Password)
2. ודא/י ש-**lottogun.com** מופיע ב-**Authentication → Settings → Authorized domains**
3. פרוס כללים (+ Storage אם הופעל):
   ```bash
   firebase deploy --only database,storage
   ```
4. היכנס ל-`/admin/ads.html` עם **Google** (`eliran.neeman@gmail.com`) או אימייל/סיסמה

> גישה לפאנל ולכתיבה ב-Firebase מוגבלת ל-**eliran.neeman@gmail.com** בלבד — גם בכללי האבטחה וגם בקוד.

### מבנה נתונים (`/ads`)

| נתיב | תוכן |
|------|------|
| `campaigns/{id}` | שם, תאריכים, עדיפות, פעיל/מושהה |
| `creatives/{id}` | תמונה, כותרת, תיאור, קישור, מיקום |
| `settings/advertiseBanner` | טקסט באנר "פרסמו אצלנו" |
| `stats/impressions`, `stats/clicks` | סטטיסטיקות |

### תצוגה באתר

- **מודעה בתחתית** — נבחרת מקמפיין פעיל (רוטציה לפי משקל)
- **באנר לעסקים** — מעודד פרסום, מוביל ל-`/contact.html?topic=advertise`
- נתוני פרסומות נטענים **פעם אחת לביקור** (`sessionStorage`) — חיסכון במכסת Firebase
