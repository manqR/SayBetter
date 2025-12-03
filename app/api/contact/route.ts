import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { name, email, message } = await req.json();

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const user = process.env.GMAIL_USER;
        const pass = process.env.GMAIL_APP_PASSWORD;

        if (!user || !pass) {
            console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass,
            },
        });

        await transporter.sendMail({
            from: `"${name}" <${user}>`, // Sender address (must be authenticated user for Gmail)
            replyTo: email, // User's email for reply
            to: user, // Send to yourself
            subject: `[SayBetter Support] Message from ${name}`,
            text: `
Name: ${name}
Email: ${email}

Message:
${message}
      `,
            html: `
<h3>New Support Message</h3>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<hr/>
<p><strong>Message:</strong></p>
<p style="white-space: pre-wrap;">${message}</p>
      `,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
}
