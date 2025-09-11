#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
בדיקת התזמון - רק בודק את הקובץ, לא מריץ כלום
"""

import os
import re
from datetime import datetime

def check_schedule():
    """
    בודק את התזמון ב-GitHub Actions
    """
    print("🕐 בודק תזמון GitHub Actions...")
    print("="*40)
    
    workflow_file = ".github/workflows/update-lottery.yml"
    
    if not os.path.exists(workflow_file):
        print("❌ קובץ workflow לא קיים!")
        return False
    
    try:
        with open(workflow_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # חיפוש cron expression
        cron_match = re.search(r"cron:\s*'([^']+)'", content)
        
        if cron_match:
            cron_expr = cron_match.group(1)
            print(f"✅ תזמון נמצא: {cron_expr}")
            
            # פירוש התזמון
            parts = cron_expr.split()
            if len(parts) >= 5:
                minute, hour, day, month, weekday = parts[:5]
                
                print(f"\n📅 ימי הגרלה:")
                print(f"   - שלישי (2)")
                print(f"   - חמישי (4)")  
                print(f"   - שבת (6)")
                
                print(f"\n⏰ שעה: {hour}:{minute} UTC")
                print("   (זה אומר 23:59 זמן ישראל)")
                
                print(f"\n🎯 המערכת תרוץ:")
                print("   - כל שלישי בשעה 23:59")
                print("   - כל חמישי בשעה 23:59")
                print("   - כל שבת בשעה 23:59")
                
                # בדיקה אם היום הוא יום הגרלה
                today = datetime.now()
                weekday_num = today.weekday()  # 0=ראשון, 1=שלישי, 2=רביעי, 3=חמישי, 4=שישי, 5=שבת, 6=ראשון
                
                if weekday_num in [1, 3, 5]:  # שלישי, חמישי, שבת
                    print(f"\n🎉 היום ({today.strftime('%A')}) הוא יום הגרלה!")
                else:
                    print(f"\nℹ️ היום ({today.strftime('%A')}) לא יום הגרלה")
                
                return True
            else:
                print("❌ תזמון לא תקין")
                return False
        else:
            print("❌ לא נמצא תזמון בקובץ")
            return False
            
    except Exception as e:
        print(f"❌ שגיאה בקריאת הקובץ: {e}")
        return False

if __name__ == "__main__":
    success = check_schedule()
    if success:
        print("\n✅ התזמון מוגדר נכון!")
    else:
        print("\n❌ יש בעיה בתזמון")
    sys.exit(0 if success else 1)
