# LottoGun

אתר הצעות צירופים ללוטו הישראלי, על בסיס כל הגרלות השיטה הנוכחית (6 מתוך 37 + מספר חזק 1-7, מאז מאי 2011).

## איך זה עובד

1. הארכיון הרשמי יורד מאתר מפעל הפיס: `https://www.pais.co.il/Lotto/lotto_resultsDownload.aspx`
2. נשמרות רק הגרלות השיטה הנוכחית ב-`lottery_results.json`
3. האתר מציג הצעות צירופים, סטטיסטיקות ואת כל התוצאות
4. Firebase Function רצה כל יום בחצות שעון ישראל, בודקת אם יצאה הגרלה חדשה ומעדכנת את Realtime Database

## עדכון מקומי

```bash
python3 scripts/sync_pais_results.py
```

## פריסת פונקציית Firebase

```bash
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
firebase deploy --only functions,database
```

הפונקציה `checkLotteryResults` רצה כל לילה ב-00:00 לפי `Asia/Jerusalem`.
אפשר גם להריץ ידנית דרך `checkLotteryNow`.
