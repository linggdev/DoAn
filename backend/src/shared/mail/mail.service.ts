import { Global, Injectable, Logger, Module } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface InterviewInvitePayload {
  toEmails: string[];
  candidateName: string;
  jobTitle: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingLink?: string | null;
  location?: string | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT || 1025),
    secure: false,
  });

  /** Tạo nội dung file lịch hẹn chuẩn iCalendar (.ics) theo RFC 5545 */
  buildIcsContent(payload: InterviewInvitePayload): string {
    const start = payload.scheduledAt;
    const end = new Date(start.getTime() + payload.durationMinutes * 60_000);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const location = payload.meetingLink || payload.location || 'Online Meeting';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Internal Enterprise ATS//VN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:ats-${Date.now()}@ats.local`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:Phỏng vấn [${payload.jobTitle}] - ${payload.candidateName}`,
      `DESCRIPTION:Lịch phỏng vấn vị trí ${payload.jobTitle} cho ứng viên ${payload.candidateName}.`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  /** Gửi sau khi DB Transaction đã commit (D16: lỗi gửi mail không làm rollback nghiệp vụ). */
  async sendInterviewInvite(payload: InterviewInvitePayload): Promise<void> {
    try {
      const ics = this.buildIcsContent(payload);
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'ATS <no-reply@ats.local>',
        to: payload.toEmails.join(', '),
        subject: `[Lịch phỏng vấn] ${payload.jobTitle} — ${payload.candidateName}`,
        text: `Xin chào,\n\nBuổi phỏng vấn cho vị trí "${payload.jobTitle}" (Ứng viên: ${payload.candidateName}) đã được xếp lịch vào ${payload.scheduledAt.toISOString()} (${payload.durationMinutes} phút).\nĐịa điểm / Link: ${payload.meetingLink || payload.location || 'Cập nhật sau'}`,
        icalEvent: {
          filename: 'interview-invite.ics',
          method: 'request',
          content: ics,
        },
      });
    } catch (err) {
      this.logger.warn(`Không gửi được email lịch phỏng vấn (bỏ qua theo D16): ${(err as Error).message}`);
    }
  }
}

@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}

