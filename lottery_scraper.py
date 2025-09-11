#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
סקריפט לעדכון תוצאות לוטו
מזהה תוצאות מהאתר ומעדכן את קובץ האקסל
"""

import pandas as pd
import re
import json
import sys
from datetime import datetime
from bs4 import BeautifulSoup
import os
from playwright.sync_api import sync_playwright


class LotteryScraper:
    def __init__(self):
        self.url = "https://www.pais.co.il/lotto/"
        self.excel_file = "Lotto.xlsx"

    def get_website_content(self):
        """
        מקבל את תוכן האתר באמצעות Playwright (כמו דפדפן אמיתי)
        """
        print("🌐 טוען את האתר עם Playwright...")
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(self.url, timeout=60000)
            page.wait_for_timeout(5000)  # המתנה לטעינת JS
            html = page.content()
            browser.close()
        print("✅ האתר נטען בהצלחה עם Playwright")
        return html

    def extract_lottery_numbers(self, html_content):
        """
        מחלץ מספרי לוטו מהאתר
        """
        print("🔍 מחפש מספרי לוטו באתר...")
        try:
            soup = BeautifulSoup(html_content, 'html.parser')

            # חיפוש המספרים הזוכים מעל הכיתוב "תוצאת הגרלה לוטו"
            numbers = self.find_numbers_near_text(soup, "תוצאת הגרלה לוטו")

            # חיפוש המספר החזק
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
        numbers = []
        elements_with_text = soup.find_all(string=re.compile(target_text, re.I))

        for text_element in elements_with_text:
            parent = text_element.parent
            if not parent:
                continue

            loto_numbers = parent.find_all('div', class_='loto_info_num')
            for loto_elem in loto_numbers:
                inner_div = loto_elem.find('div')
                if inner_div:
                    number_text = inner_div.get_text().strip()
                    if number_text.isdigit():
                        num = int(number_text)
                        if 1 <= num <= 37 and num not in numbers:
                            numbers.append(num)
                            if len(numbers) >= 6:
                                break
            if len(numbers) >= 6:
                break

        return numbers[:6] if len(numbers) >= 6 else []

    def find_strong_number_near_text(self, soup, target_text):
        """
        מוצא מספר חזק ליד טקסט מסוים
        """
        elements_with_text = soup.find_all(string=re.compile(target_text, re.I))

        for text_element in elements_with_text:
            parent = text_element.parent
            if not parent:
                continue

            strong_numbers = parent.find_all('div', class_='loto_info_num strong')
            for strong_elem in strong_numbers:
                inner_div = strong_elem.find('div')
                if inner_div:
                    number_text = inner_div.get_text().strip()
                    if number_text.isdigit():
                        num = int(number_text)
                        if 1 <= num <= 8:
                            return num
        return None

    def get_lottery_date(self, html_content):
        """
        מקבל את תאריך ההגרלה מהאתר
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            date_elements = soup.find_all(string=re.compile(r'מיום.*בשעה', re.I))
            if date_elements:
                date_text = date_elements[0].strip()
                date_pattern = r'(\d{1,2}/\d{1,2}/\d{4})'
                match = re.search(date_pattern, date_text)
                if match:
                    formatted_date = match.group(1)
                    print(f"📅 תאריך ההגרלה: {formatted_date}")
                    return formatted_date

            current_date = datetime.now().strftime('%d/%m/%Y')
            print(f"⚠️ לא נמצא תאריך, משתמש בתאריך נוכחי: {current_date}")
            return current_date

        except Exception as e:
            print(f"❌ שגיאה בחיפוש תאריך: {e}")
            return datetime.now().strftime('%d/%m/%Y')

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
        latest = existing_df.iloc[0]  # השורה הראשונה היא האחרונה
        existing_numbers = [latest[1], latest[2], latest[3],
                            latest[4], latest[5], latest[6]]
        existing_strong = latest['המספר החזק']
        return (sorted(new_numbers) == sorted(existing_numbers)
                and new_strong == existing_strong)

    def update_excel(self, numbers, strong_number, html_content):
        """
        מעדכן את קובץ האקסל
        """
        existing_df = self.load_existing_data()
        if self.is_duplicate(numbers, strong_number, existing_df):
            print("ℹ️ התוצאה כבר קיימת - לא מעדכן")
            return False

        lottery_date = self.get_lottery_date(html_content)
        new_row = {
            'תאריך': pd.to_datetime(lottery_date, dayfirst=True),
            1: numbers[0], 2: numbers[1], 3: numbers[2],
            4: numbers[3], 5: numbers[4], 6: numbers[5],
            'המספר החזק': strong_number
        }
        new_df = pd.DataFrame([new_row])
        updated_df = pd.concat([new_df, existing_df], ignore_index=True)
        updated_df.to_excel(self.excel_file, index=False)
        print(f"✅ קובץ עודכן! יש עכשיו {len(updated_df)} הגרלות")
        return True

    def update_statistics(self):
        """
        מעדכן סטטיסטיקות
        """
        try:
            df = pd.read_excel(self.excel_file)
            regular_stats = {i: int(sum((df[col] == i).sum() for col in [1, 2, 3, 4, 5, 6]))
                             for i in range(1, 38)}
            strong_stats = {i: int((df['המספר החזק'] == i).sum())
                            for i in range(1, 9)}
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
        print("🚀 מתחיל עדכון תוצאות לוטו...")
        print("="*50)
        html_content = self.get_website_content()
        if not html_content:
            return False
        numbers, strong_number = self.extract_lottery_numbers(html_content)
        if not numbers or not strong_number:
            print("❌ לא נמצאו מספרים באתר")
            return False
        if self.update_excel(numbers, strong_number, html_content):
            self.update_statistics()
        print("\n🎉 העדכון הושלם בהצלחה!")
        return True


def main():
    scraper = LotteryScraper()
    success = scraper.run()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
