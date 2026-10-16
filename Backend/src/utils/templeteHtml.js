export const verifyEmailTemplate = (email, userName, verificationUrl) => {
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; border: 1px solid #e0e0e0; padding: 30px; border-radius: 12px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background-color: #ffffff;">
      
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #4CAF50; padding-bottom: 15px; margin-bottom: 25px;">
        <h2 style="color: #2c3e50; margin: 0;">📚 موقع <span style="color: #4CAF50;">صراحة</span></h2>
      </div>
      
      <!-- Content -->
      <h2 style="color: #2c3e50; font-size: 22px; margin-bottom: 15px;">أهلاً بك يا ${userName} 👋</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #555; margin-bottom: 20px;">
        شكراً لتسجيلك في تطبيق معرفة! يرجى تأكيد ملكيتك لهذا البريد الإلكتروني لتفعيل حسابك والبدء في استخدام كافة الميزات.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);">
          تأكيد تفعيل الحساب
        </a>
      </div>

      <!-- Warning / Expiration Note -->
      <div style="background-color: #fff9db; padding: 15px; border-radius: 8px; border-right: 4px solid #fcc419; margin: 25px 0; font-size: 14px; color: #666;">
        <p style="margin: 0; line-height: 1.5;">
          ⚠️ <strong>ملاحظة:</strong> هذا الرابط صالح لمدة محددة (مثلاً 24 ساعة). إذا انتهت الصلاحية ستكُون بحاجة لطلب رابط تفعيل جديد.
        </p>
      </div>

      <p style="font-size: 14px; color: #777; line-height: 1.5;">
        إذا واجهت مشكلة في الضغط على الزر، يمكنك نسخ الرابط التالي ولصقه في متصفحك مباشرة:
        <br>
        <a href="${verificationUrl}" style="color: #4CAF50; word-break: break-all; font-size: 13px;">${verificationUrl}</a>
      </p>
      
      <!-- Footer -->
      <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
        <p style="margin: 5px 0;">© 2026 تطبيق معرفة - جميع الحقوق محفوظة</p>
        <p style="margin: 5px 0;">إذا لم تقم بإنشاء حساب على منصتنا، يمكنك تجاهل هذا البريد بأمان.</p>
      </div>
      
    </div>
  `;
};
