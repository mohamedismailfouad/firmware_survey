import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendSurveyNotification(survey) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'azka.innovation@gmail.com',
    subject: `New Survey Submission - ${survey.fullName}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #1a5f7a; border-bottom: 2px solid #159895; padding-bottom: 10px;">
          New Survey Submission
        </h2>
        <p>A new survey has been submitted on the AZKA Firmware Team Survey.</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1a5f7a; margin-top: 0;">Submitter Details:</h3>
          <p><strong>Name:</strong> ${survey.fullName}</p>
          <p><strong>Email:</strong> ${survey.email}</p>
          <p><strong>HR Code:</strong> ${survey.hrCode}</p>
          <p><strong>Department:</strong> ${survey.department}</p>
          <p><strong>Title:</strong> ${survey.title}</p>
          <p><strong>Project:</strong> ${survey.projectName}</p>
        </div>

        <p style="color: #666; font-size: 14px;">
          Login to the admin panel to view the full survey details.
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="color: #999; font-size: 12px;">
          AZKA Firmware Team Survey System
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Notification email sent successfully');
    return true;
  } catch (error) {
    console.error('Failed to send notification email:', error.message);
    return false;
  }
}
