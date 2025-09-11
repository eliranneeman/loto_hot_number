#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
סקריפט פשוט לעדכון תוצאות לוטו
מזהה תוצאות מהאתר ומעדכן את קובץ האקסל
"""

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import pandas as pd
import re
import json
import sys
from datetime import datetime
from bs4 import BeautifulSoup
import os

class LotteryScraper:
    def __init__(self):
        self.urls = [
            "https://www.pais.co.il/lotto/",
            "https://pais.co.il/lotto/",
            "https://www.pais.co.il/lotto"
        ]
        self.excel_file = "Lotto.xlsx"
        
    def get_website_content(self):
        """
        מקבל את תוכן האתר
        """
        import time
        
        # יצירת session עם retry strategy
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        for url_index, url in enumerate(self.urls):
            for attempt in range(2):  # 2 ניסיונות לכל URL
                try:
                    print(f"🌐 מתחבר לאתר מפעל הפיס... (URL {url_index + 1}/{len(self.urls)}, ניסיון {attempt + 1}/2)")
                    
                    # הוספת headers כדי להיראות כמו דפדפן רגיל
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1'
                    }
                    
                    response = session.get(url, timeout=30, headers=headers)
                
                    if response.status_code == 200:
                        print("✅ האתר נטען בהצלחה")
                        return response.text
                    else:
                        print(f"❌ שגיאה: {response.status_code}")
                        if attempt < 1:  # לא הניסיון האחרון
                            print("⏳ ממתין 3 שניות לפני ניסיון נוסף...")
                            time.sleep(3)
                            continue
                        break  # עובר ל-URL הבא
                        
                except Exception as e:
                    print(f"❌ שגיאה בחיבור: {e}")
                    if attempt < 1:  # לא הניסיון האחרון
                        print("⏳ ממתין 3 שניות לפני ניסיון נוסף...")
                        time.sleep(3)
                        continue
                    break  # עובר ל-URL הבא
        
        # אם כל הניסיונות נכשלו, ננסה עם wget/curl
        print("🔄 מנסה חלופה עם wget...")
        try:
            import subprocess
            result = subprocess.run(['wget', '-q', '-O', '-', 'https://www.pais.co.il/lotto/'], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                print("✅ האתר נטען בהצלחה עם wget")
                return result.stdout
        except Exception as e:
            print(f"❌ שגיאה עם wget: {e}")
        
        return None
    
    def extract_lottery_numbers(self, html_content):
        """
        מחלץ מספרי לוטו מהאתר
        """
        print("🔍 מחפש מספרי לוטו באתר...")
        
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # חיפוש המספרים הזוכים מעל הכיתוב "תוצאת הגרלה לוטו"
            numbers = self.find_numbers_near_text(soup, "תוצאת הגרלה לוטו")
            
            # חיפוש המספר החזק מעל הכיתוב "המספר החזק"
            strong_number = self.find_strong_number_near_text(soup, "המספר החזק")
            
            if len(numbers) >= 6 and strong_number:
                print(f"✅ נמצאו מספרים: {numbers}")
                print(f"✅ מספר חזק: {strong_number}")
                return numbers, strong_number
            else:
                print(f"⚠️ נמצאו רק {len(numbers)} מספרים")
                if not strong_number:
                    print("⚠️ לא נמצא מספר חזק")
                return None, None
                
        except Exception as e:
            print(f"❌ שגיאה בחילוץ: {e}")
            return None, None
    
    def find_numbers_near_text(self, soup, target_text):
        """
        מוצא מספרים ליד טקסט מסוים
        """
        print(f"🔍 מחפש מספרים ליד '{target_text}'...")
        
        # חיפוש כל האלמנטים שמכילים את הטקסט
        elements_with_text = soup.find_all(string=re.compile(target_text, re.I))
        
        numbers = []
        
        for text_element in elements_with_text:
            # מצא את האלמנט האב
            parent = text_element.parent
            if not parent:
                continue
            
            print(f"🔍 נמצא טקסט: '{text_element.strip()}'")
            
            # חפש אלמנטים עם קלאס loto_info_num באלמנט האב
            loto_numbers = parent.find_all('div', class_='loto_info_num')
            if loto_numbers:
                print(f"🔍 נמצאו {len(loto_numbers)} אלמנטים עם קלאס loto_info_num")
                for loto_elem in loto_numbers:
                    # חפש div פנימי עם המספר
                    inner_div = loto_elem.find('div')
                    if inner_div:
                        number_text = inner_div.get_text().strip()
                        if number_text.isdigit():
                            num = int(number_text)
                            if 1 <= num <= 37 and num not in numbers:
                                numbers.append(num)
                                print(f"✅ נמצא מספר: {num}")
                                if len(numbers) >= 6:
                                    break
            
            # אם מצאנו מספיק מספרים, נעצור
            if len(numbers) >= 6:
                break
            
            # אם לא מצאנו באלמנט האב, חפש באחים
            if len(numbers) < 6:
                # חפש באחים קודמים
                current = parent.previous_sibling
                while current and len(numbers) < 6:
                    if hasattr(current, 'find_all'):
                        loto_numbers = current.find_all('div', class_='loto_info_num')
                        for loto_elem in loto_numbers:
                            inner_div = loto_elem.find('div')
                            if inner_div:
                                number_text = inner_div.get_text().strip()
                                if number_text.isdigit():
                                    num = int(number_text)
                                    if 1 <= num <= 37 and num not in numbers:
                                        numbers.append(num)
                                        print(f"✅ נמצא מספר: {num}")
                                        if len(numbers) >= 6:
                                            break
                    current = current.previous_sibling
                
                # חפש באחים הבאים
                current = parent.next_sibling
                while current and len(numbers) < 6:
                    if hasattr(current, 'find_all'):
                        loto_numbers = current.find_all('div', class_='loto_info_num')
                        for loto_elem in loto_numbers:
                            inner_div = loto_elem.find('div')
                            if inner_div:
                                number_text = inner_div.get_text().strip()
                                if number_text.isdigit():
                                    num = int(number_text)
                                    if 1 <= num <= 37 and num not in numbers:
                                        numbers.append(num)
                                        print(f"✅ נמצא מספר: {num}")
                                        if len(numbers) >= 6:
                                            break
                    current = current.next_sibling
        
        return numbers[:6] if len(numbers) >= 6 else []
    
    def find_strong_number_near_text(self, soup, target_text):
        """
        מוצא מספר חזק ליד טקסט מסוים
        """
        print(f"🔍 מחפש מספר חזק ליד '{target_text}'...")
        
        # חיפוש כל האלמנטים שמכילים את הטקסט
        elements_with_text = soup.find_all(string=re.compile(target_text, re.I))
        
        for text_element in elements_with_text:
            # מצא את האלמנט האב
            parent = text_element.parent
            if not parent:
                continue
            
            print(f"🔍 נמצא טקסט: '{text_element.strip()}'")
            
            # חפש אלמנטים עם קלאס loto_info_num strong באלמנט האב
            strong_numbers = parent.find_all('div', class_='loto_info_num strong')
            if strong_numbers:
                print(f"🔍 נמצאו {len(strong_numbers)} אלמנטים עם קלאס loto_info_num strong")
                for strong_elem in strong_numbers:
                    # חפש div פנימי עם המספר
                    inner_div = strong_elem.find('div')
                    if inner_div:
                        number_text = inner_div.get_text().strip()
                        if number_text.isdigit():
                            num = int(number_text)
                            if 1 <= num <= 8:
                                print(f"✅ נמצא מספר חזק: {num}")
                                return num
            
            # אם לא מצאנו באלמנט האב, חפש באחים
            # חפש באחים קודמים
            current = parent.previous_sibling
            while current:
                if hasattr(current, 'find_all'):
                    strong_numbers = current.find_all('div', class_='loto_info_num strong')
                    for strong_elem in strong_numbers:
                        inner_div = strong_elem.find('div')
                        if inner_div:
                            number_text = inner_div.get_text().strip()
                            if number_text.isdigit():
                                num = int(number_text)
                                if 1 <= num <= 8:
                                    print(f"✅ נמצא מספר חזק: {num}")
                                    return num
                current = current.previous_sibling
            
            # חפש באחים הבאים
            current = parent.next_sibling
            while current:
                if hasattr(current, 'find_all'):
                    strong_numbers = current.find_all('div', class_='loto_info_num strong')
                    for strong_elem in strong_numbers:
                        inner_div = strong_elem.find('div')
                        if inner_div:
                            number_text = inner_div.get_text().strip()
                            if number_text.isdigit():
                                num = int(number_text)
                                if 1 <= num <= 8:
                                    print(f"✅ נמצא מספר חזק: {num}")
                                    return num
                current = current.next_sibling
        
        return None
    
    def get_lottery_date(self, html_content):
        """
        מקבל את תאריך ההגרלה מהאתר
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # חיפוש התאריך הספציפי מהאתר
            # מחפש טקסט שמכיל "מיום" ו"בשעה"
            date_elements = soup.find_all(string=re.compile(r'מיום.*בשעה', re.I))
            
            if date_elements:
                date_text = date_elements[0].strip()
                print(f"🔍 נמצא טקסט תאריך: '{date_text}'")
                
                # חילוץ התאריך מהטקסט
                # דוגמה: "מיום שלישי 9 בספטמבר 2025 בשעה 23:16"
                date_pattern = r'(\d{1,2})\s+בספטמבר\s+(\d{4})'
                match = re.search(date_pattern, date_text)
                
                if match:
                    day = match.group(1)
                    year = match.group(2)
                    month = "09"  # ספטמבר הוא חודש 9
                    
                    formatted_date = f"{day.zfill(2)}/{month}/{year}"
                    print(f"📅 תאריך ההגרלה: {formatted_date}")
                    return formatted_date
            
            # אם לא מצאנו את התאריך הספציפי, נחפש תאריכים אחרים
            all_text = soup.get_text()
            date_pattern = r'\b(\d{1,2}/\d{1,2}/\d{4})\b'
            dates = re.findall(date_pattern, all_text)
            
            if dates:
                # נחזיר את התאריך הראשון שמצאנו
                lottery_date = dates[0]
                # וידוא שהתאריך בפורמט DD/MM/YYYY
                day, month, year = lottery_date.split('/')
                formatted_date = f"{day.zfill(2)}/{month.zfill(2)}/{year}"
                print(f"📅 תאריך ההגרלה: {formatted_date}")
                return formatted_date
            else:
                # אם לא מצאנו תאריך, נחזיר את התאריך הנוכחי בפורמט DD/MM/YYYY
                current_date = datetime.now().strftime('%d/%m/%Y')
                print(f"⚠️ לא נמצא תאריך הגרלה, משתמש בתאריך נוכחי: {current_date}")
                return current_date
                
        except Exception as e:
            print(f"❌ שגיאה בחיפוש תאריך: {e}")
            # אם יש שגיאה, נחזיר את התאריך הנוכחי בפורמט DD/MM/YYYY
            current_date = datetime.now().strftime('%d/%m/%Y')
            print(f"⚠️ משתמש בתאריך נוכחי: {current_date}")
            return current_date
    
    def load_existing_data(self):
        """
        טוען נתונים קיימים
        """
        if os.path.exists(self.excel_file):
            try:
                df = pd.read_excel(self.excel_file)
                print(f"📊 נטענו {len(df)} הגרלות קיימות")
                return df
            except Exception as e:
                print(f"❌ שגיאה בטעינה: {e}")
                return pd.DataFrame()
        else:
            print("ℹ️ קובץ אקסל לא קיים - נוצר חדש")
            return pd.DataFrame()
    
    def is_duplicate(self, new_numbers, new_strong, existing_df):
        """
        בודק אם התוצאה כבר קיימת
        """
        if existing_df.empty:
            return False
        
        # בדיקת התוצאה האחרונה
        latest = existing_df.iloc[-1]
        existing_numbers = [
            latest[1], latest[2], latest[3],
            latest[4], latest[5], latest[6]
        ]
        existing_strong = latest['המספר החזק']
        
        # השוואה
        if (sorted(new_numbers) == sorted(existing_numbers) and 
            new_strong == existing_strong):
            return True
        
        return False
    
    def update_excel(self, numbers, strong_number, html_content):
        """
        מעדכן את קובץ האקסל
        """
        print("📊 מעדכן קובץ אקסל...")
        
        try:
            # טעינת נתונים קיימים
            existing_df = self.load_existing_data()
            
            # בדיקת כפילות
            if self.is_duplicate(numbers, strong_number, existing_df):
                print("ℹ️ התוצאה כבר קיימת - לא מעדכן")
                return False
            
            # קבלת תאריך ההגרלה מהאתר
            lottery_date = self.get_lottery_date(html_content)
            
            # יצירת שורה חדשה
            new_row = {
                'תאריך': pd.to_datetime(lottery_date),
                1: numbers[0],
                2: numbers[1],
                3: numbers[2],
                4: numbers[3],
                5: numbers[4],
                6: numbers[5],
                'המספר החזק': strong_number
            }
            
            # הוספה לקובץ - השורה החדשה תהיה הראשונה (ההגרלה האחרונה)
            new_df = pd.DataFrame([new_row])
            updated_df = pd.concat([new_df, existing_df], ignore_index=True)
            
            # שמירה
            updated_df.to_excel(self.excel_file, index=False)
            
            print(f"✅ קובץ עודכן! יש עכשיו {len(updated_df)} הגרלות")
            return True
            
        except Exception as e:
            print(f"❌ שגיאה בעדכון: {e}")
            return False
    
    def update_statistics(self):
        """
        מעדכן סטטיסטיקות
        """
        print("📈 מעדכן סטטיסטיקות...")
        
        try:
            df = pd.read_excel(self.excel_file)
            
            # חישוב סטטיסטיקות
            regular_stats = {}
            for i in range(1, 38):
                count = 0
                for col in [1, 2, 3, 4, 5, 6]:
                    count += (df[col] == i).sum()
                regular_stats[i] = int(count)
            
            strong_stats = {}
            for i in range(1, 9):
                count = (df['המספר החזק'] == i).sum()
                strong_stats[i] = int(count)
            
            # שמירה
            stats = {
                'regular_stats': regular_stats,
                'strong_stats': strong_stats,
                'last_updated': datetime.now().isoformat(),
                'total_draws': len(df)
            }
            
            with open('lottery_stats.json', 'w', encoding='utf-8') as f:
                json.dump(stats, f, ensure_ascii=False, indent=2)
            
            print("✅ סטטיסטיקות עודכנו")
            return True
            
        except Exception as e:
            print(f"❌ שגיאה בעדכון סטטיסטיקות: {e}")
            return False
    
    def run(self):
        """
        מריץ את התהליך המלא
        """
        print("🚀 מתחיל עדכון תוצאות לוטו...")
        print("="*50)
        
        # קבלת תוכן האתר
        html_content = self.get_website_content()
        if not html_content:
            return False
        
        # חילוץ מספרים
        numbers, strong_number = self.extract_lottery_numbers(html_content)
        if not numbers or not strong_number:
            print("❌ לא נמצאו מספרים באתר")
            return False
        
        # עדכון קובץ אקסל
        if not self.update_excel(numbers, strong_number, html_content):
            print("ℹ️ לא נדרש עדכון")
            return True
        
        # עדכון סטטיסטיקות
        self.update_statistics()
        
        print("\n🎉 העדכון הושלם בהצלחה!")
        return True

def main():
    """
    פונקציה ראשית
    """
    scraper = LotteryScraper()
    success = scraper.run()
    
    if success:
        print("✅ הכל עבד תקין!")
    else:
        print("❌ הייתה בעיה")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
