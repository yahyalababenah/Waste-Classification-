# مشروع فرز نفايات (Web + Arduino) — O / I / E

هذا مشروع كامل جاهز:
- **Web App** يفتح من المتصفح ويستخدم كاميرا اللابتوب ويعمل تصنيف مستمر:
  - **O** = Organic
  - **I** = Inorganic
  - **E** = Empty (لا يوجد شيء أمام الكاميرا)
- يرسل الحرف (O/I/E) مباشرة إلى **Arduino عبر USB** باستخدام **Web Serial API** (بدون تنصيب مكتبات بايثون للمستخدم).

> مهم: Web Serial يعمل على **Chrome/Edge** على الكمبيوتر (Windows/Mac/Linux).

---

## 1) تشغيل الـ Web App

### خيار (A) محلي — أسرع طريقة
1. افتح مجلد `WasteSorterWebSerial/web`
2. شغّل سيرفر بسيط:

**Windows (PowerShell / CMD):**
```bash
cd WasteSorterWebSerial\web
python -m http.server 8000
```

3. افتح المتصفح على:
- `http://localhost:8000`

4. اضغط:
- **تشغيل الكاميرا**
- ثم **ربط Arduino (Web Serial)** واختر منفذ Arduino

### خيار (B) أونلاين — رابط لأي شخص
ارفع محتويات مجلد `web/` على أي استضافة Static مثل:
- GitHub Pages
- Netlify
- Vercel
- أي hosting بسيط

ثم أعطي المستخدم الرابط.

> لازم يكون الرابط https حتى تشتغل الكاميرا.

---

## 2) رفع كود Arduino

افتح الملف:
`WasteSorterWebSerial/arduino/WasteSorter_Arduino.ino`

ثم Upload للأردوينو.

### توصيل السيرفو MG995 (مهم جدًا)
- **Red** -> 5V خارجي (مزود قوي، 2A+)
- **Brown/Black** -> GND خارجي
- **Orange** -> D9 و D10 (إشارة)
- اربط **GND الخارجي مع GND الأردوينو** (مشترك)

---

## 3) تعديل خريطة التصنيف (Mapping)

الـ Web App يستخدم نموذج جاهز للكشف: **COCO-SSD** (يعطي label مثل: bottle, banana...)
ثم نحوله إلى O/I/E في الملف:
`web/app.js`

ابحث عن:
- `ORGANIC_LABELS`
- `INORGANIC_LABELS`

وعدّلها حسب حاجتك.

---

## 4) ملاحظات مهمّة لتحسين النتيجة بسرعة
- خلي الخلفية **A4 بيضاء** (قرار ممتاز).
- خلي الجسم واضح في منتصف الكاميرا.
- ارفع/أنزل `Threshold كشف الجسم` من الموقع:
  - إذا بيلقط أشياء غلط: ارفعها (0.7 مثلاً)
  - إذا ما بيلقط: نزّلها (0.5)

---

## مشاكل شائعة
- **Connect Arduino لا يعمل**: تأكد أنك تستخدم Chrome/Edge وليس Firefox.
- **الكاميرا لا تعمل**: افتح من https أو localhost.
- **السيرفو يهتز/لا يتحرك**: مزود طاقة ضعيف أو GND غير مشترك.

بالتوفيق ✅
