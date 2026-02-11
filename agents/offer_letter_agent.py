"""
Offer Letter Agent
------------------
Reads interview_scores.xlsx and sends offer letters to candidates
with "Consider" or "Recommend" recommendations.
Generates professional PDF offer letter and sends via email.
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from datetime import datetime, timedelta
import pandas as pd
from dotenv import load_dotenv
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

load_dotenv()


class OfferLetterAgent:
    """Generates and sends offer letters to selected candidates."""
    
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SENDER_EMAIL")
        self.sender_password = os.getenv("SENDER_PASSWORD")  # App password for Gmail
        
        self.scores_file = os.path.join(os.getcwd(), "data", "interview_scores.xlsx")
        self.offers_dir = os.path.join(os.getcwd(), "offer_letters")
        self.sent_log = os.path.join(os.getcwd(), "data", "sent_offers.xlsx")
        
        os.makedirs(self.offers_dir, exist_ok=True)
        
        self.company_name = "Agentic HR"
        self.company_email = "hr@agentichr.ai"
        self.company_website = "www.agentichr.ai"
        
        self.acceptance_days = 7
        
        print("\n" + "="*60)
        print("[START] OFFER LETTER AGENT")
        print("="*60)
        print(f"[CONFIG] Scores file: {self.scores_file}")
        print(f"[CONFIG] Offers dir: {self.offers_dir}")
        print(f"[CONFIG] Sender: {self.sender_email}")
        print("="*60 + "\n")
    
    def get_eligible_candidates(self):
        """Get candidates with Consider/Recommend/Strongly Recommend."""
        if not os.path.exists(self.scores_file):
            print(f"[ERROR] Scores file not found: {self.scores_file}")
            return []
        
        df = pd.read_excel(self.scores_file)
        
        eligible = df[df['Recommendation'].isin(['Consider', 'Recommend', 'Strongly Recommend'])]
        
        sent_emails = set()
        if os.path.exists(self.sent_log):
            sent_df = pd.read_excel(self.sent_log)
            sent_emails = set(sent_df['Email'].tolist())
        
        new_candidates = []
        for _, row in eligible.iterrows():
            email = row.get('Email', '')
            if email and email != 'Not provided' and email not in sent_emails:
                new_candidates.append(row.to_dict())
        
        return new_candidates
    
    def generate_pdf(self, candidate):
        """Generate a professional, colorful PDF offer letter."""
        name = candidate.get('Candidate Name', 'Candidate')
        email = candidate.get('Email', '')
        role = candidate.get('Role', 'Position')
        score = candidate.get('Total Score', 0)
        recommendation = candidate.get('Recommendation', '')
        filename = f"Offer_Letter_{name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        filepath = os.path.join(self.offers_dir, filename)
        
        doc = SimpleDocTemplate(filepath, pagesize=A4, 
                               rightMargin=0.75*inch, leftMargin=0.75*inch,
                               topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        styles = getSampleStyleSheet()
        story = []
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            textColor=colors.HexColor('#1E3A5F'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        header_style = ParagraphStyle(
            'Header',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#4A90A4'),
            spaceAfter=5,
            alignment=TA_CENTER
        )
        
        section_style = ParagraphStyle(
            'Section',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2E7D32'),
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        )
        
        body_style = ParagraphStyle(
            'Body',
            parent=styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#333333'),
            spaceAfter=10,
            alignment=TA_JUSTIFY,
            leading=16
        )
        
        highlight_style = ParagraphStyle(
            'Highlight',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#1E3A5F'),
            backColor=colors.HexColor('#E8F4FD'),
            borderPadding=10,
            spaceAfter=15
        )
        
        header_data = [[
            Paragraph(f"<b>{self.company_name}</b>", ParagraphStyle('CompanyName', fontSize=24, textColor=colors.white, alignment=TA_CENTER))
        ]]
        header_table = Table(header_data, colWidths=[6.5*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#1E3A5F')),
            ('TOPPADDING', (0, 0), (-1, -1), 20),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 10))
        
        # Subtitle
        story.append(Paragraph("Building the Future of Intelligent HR", header_style))
        story.append(Spacer(1, 20))
        
        # Title
        story.append(Paragraph("OFFER OF EMPLOYMENT", title_style))
        story.append(Spacer(1, 10))
        
        # Date
        story.append(Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')}", body_style))
        story.append(Spacer(1, 15))
        
        # Dear Candidate
        story.append(Paragraph(f"<b>Dear {name},</b>", body_style))
        story.append(Spacer(1, 10))
        
        # Main content
        story.append(Paragraph(
            f"We are pleased to inform you that you have been <b>selected for the position of {role}</b> "
            f"at <b>{self.company_name}</b> after successfully completing our interview and evaluation process.",
            body_style
        ))
        
        story.append(Paragraph(
            f"At {self.company_name}, we are building intelligent, AI-driven systems to transform modern hiring "
            "and HR workflows. Based on your skills, experience, and performance during the selection process, "
            "we strongly believe you will be a valuable addition to our team.",
            body_style
        ))
        
        # Position Details Section
        story.append(Paragraph("Position Details", section_style))
        
        deadline = (datetime.now() + timedelta(days=self.acceptance_days)).strftime('%B %d, %Y')
        
        details_data = [
            ['Role:', role],
            ['Company:', self.company_name],
            ['Employment Type:', 'Full-time'],
            ['Start Date:', 'To be mutually decided'],
            ['Work Mode:', 'Onsite'],
            ['Response Deadline:', deadline],
        ]
        
        details_table = Table(details_data, colWidths=[2*inch, 4*inch])
        details_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E8F4FD')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#1E3A5F')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(details_table)
        story.append(Spacer(1, 15))
        
        # Compensation note
        story.append(Paragraph(
            "Your compensation package, benefits, and other terms of employment will be shared with you "
            "separately or discussed during the onboarding process.",
            body_style
        ))
        
        # Call to action
        story.append(Paragraph("Next Steps", section_style))
        story.append(Paragraph(
            f"Please confirm your <b>acceptance of this offer</b> by replying to this email within "
            f"<b>{self.acceptance_days} days</b> (by {deadline}). Upon confirmation, our HR team will share "
            "the next steps, including onboarding details and documentation requirements.",
            body_style
        ))
        
        # Closing
        story.append(Spacer(1, 15))
        story.append(Paragraph(
            f"We are excited about the possibility of you joining {self.company_name} and contributing "
            "to our mission of building intelligent, agent-powered HR solutions.",
            body_style
        ))
        
        story.append(Paragraph(
            "If you have any questions or need further clarification, feel free to reach out to us.",
            body_style
        ))
        
        story.append(Spacer(1, 20))
        story.append(Paragraph("<b>Welcome to the future of HR.</b>", body_style))
        
        story.append(Spacer(1, 25))
        story.append(Paragraph("Warm regards,", body_style))
        story.append(Paragraph(f"<b>HR Team</b><br/><b>{self.company_name}</b>", body_style))
        
        # Footer with contact info
        story.append(Spacer(1, 30))
        footer_data = [[
            Paragraph(f"📧 {self.company_email} | 🌐 {self.company_website}", 
                     ParagraphStyle('Footer', fontSize=10, textColor=colors.white, alignment=TA_CENTER))
        ]]
        footer_table = Table(footer_data, colWidths=[6.5*inch])
        footer_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#4A90A4')),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(footer_table)
        
        # Build PDF
        doc.build(story)
        print(f"[PDF] Generated: {filename}")
        
        return filepath
    
    def send_email(self, candidate, pdf_path):
        """Send offer letter email with PDF attachment."""
        name = candidate.get('Candidate Name', 'Candidate')
        email = candidate.get('Email', '')
        role = candidate.get('Role', 'Position')
        
        if not email or email == 'Not provided':
            print(f"[SKIP] No email for {name}")
            return False
        
        if not self.sender_email or not self.sender_password:
            print("[ERROR] Email credentials not configured in .env")
            print("        Set SENDER_EMAIL and SENDER_PASSWORD")
            return False
        
        deadline = (datetime.now() + timedelta(days=self.acceptance_days)).strftime('%B %d, %Y')
        
        # Create email
        msg = MIMEMultipart()
        msg['From'] = self.sender_email
        msg['To'] = email
        msg['Subject'] = f"Offer of Employment - {role} at {self.company_name}"
        
        # HTML body
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1E3A5F 0%, #4A90A4 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">{self.company_name}</h1>
                    <p style="color: #E8F4FD; margin: 5px 0 0 0;">Building the Future of Intelligent HR</p>
                </div>
                
                <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px;">
                    <p>Dear <strong>{name}</strong>,</p>
                    
                    <p>We are pleased to inform you that you have been <strong>selected for the position of {role}</strong> 
                    at <strong>{self.company_name}</strong> after successfully completing our interview and evaluation process.</p>
                    
                    <p>At {self.company_name}, we are building intelligent, AI-driven systems to transform modern hiring 
                    and HR workflows. Based on your skills, experience, and performance during the selection process, 
                    we strongly believe you will be a valuable addition to our team.</p>
                    
                    <div style="background: #E8F4FD; padding: 20px; border-radius: 8px; border-left: 4px solid #1E3A5F; margin: 20px 0;">
                        <h3 style="color: #1E3A5F; margin-top: 0;">Position Details</h3>
                        <table style="width: 100%;">
                            <tr><td style="padding: 5px 0;"><strong>Role:</strong></td><td>{role}</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Company:</strong></td><td>{self.company_name}</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Employment Type:</strong></td><td>Full-time</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Start Date:</strong></td><td>To be mutually decided</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Work Mode:</strong></td><td>Remote / Hybrid / Onsite</td></tr>
                        </table>
                    </div>
                    
                    <p>Your compensation package, benefits, and other terms of employment will be shared with you 
                    separately or discussed during the onboarding process.</p>
                    
                    <p>Please confirm your <strong>acceptance of this offer</strong> by replying to this email within 
                    <strong>{self.acceptance_days} days</strong> (by {deadline}). Upon confirmation, our HR team will share 
                    the next steps, including onboarding details and documentation requirements.</p>
                    
                    <p>We are excited about the possibility of you joining {self.company_name} and contributing 
                    to our mission of building intelligent, agent-powered HR solutions.</p>
                    
                    <p style="font-size: 18px; color: #2E7D32; font-weight: bold;">Welcome to the future of HR! 🚀</p>
                    
                    <p>Warm regards,<br/>
                    <strong>HR Team</strong><br/>
                    <strong>{self.company_name}</strong></p>
                </div>
                
                <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
                    <p>📧 {self.company_email} | 🌐 {self.company_website}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Attach PDF
        with open(pdf_path, 'rb') as f:
            pdf_attachment = MIMEApplication(f.read(), _subtype='pdf')
            pdf_attachment.add_header('Content-Disposition', 'attachment', 
                                      filename=os.path.basename(pdf_path))
            msg.attach(pdf_attachment)
        
        # Send email
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
            server.quit()
            print(f"[EMAIL] Sent to {email}")
            return True
        except Exception as e:
            print(f"[ERROR] Failed to send email: {e}")
            return False
    
    def log_sent_offer(self, candidate):
        """Log sent offer to avoid duplicates."""
        new_entry = {
            'Candidate Name': candidate.get('Candidate Name'),
            'Email': candidate.get('Email'),
            'Role': candidate.get('Role'),
            'Sent Date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Status': 'Sent'
        }
        
        if os.path.exists(self.sent_log):
            df = pd.read_excel(self.sent_log)
        else:
            df = pd.DataFrame(columns=['Candidate Name', 'Email', 'Role', 'Sent Date', 'Status'])
        
        df = pd.concat([df, pd.DataFrame([new_entry])], ignore_index=True)
        df.to_excel(self.sent_log, index=False)
    
    def process_candidates(self):
        """Process all eligible candidates."""
        candidates = self.get_eligible_candidates()
        
        if not candidates:
            print("[INFO] No new eligible candidates found")
            return
        
        print(f"[FOUND] {len(candidates)} candidate(s) to process\n")
        
        for candidate in candidates:
            name = candidate.get('Candidate Name', 'Unknown')
            email = candidate.get('Email', 'N/A')
            recommendation = candidate.get('Recommendation', 'N/A')
            
            print(f"\n{'='*50}")
            print(f"[CANDIDATE] {name}")
            print(f"[EMAIL] {email}")
            print(f"[RECOMMENDATION] {recommendation}")
            print('='*50)
            
            # Generate PDF
            print("[STEP 1] Generating PDF offer letter...")
            pdf_path = self.generate_pdf(candidate)
            
            # Send email
            print("[STEP 2] Sending email...")
            if self.send_email(candidate, pdf_path):
                # Log as sent
                self.log_sent_offer(candidate)
                print(f"[COMPLETE] Offer sent to {name}")
            else:
                print(f"[FAILED] Could not send offer to {name}")
    
    def run(self):
        """Main entry point."""
        print("[RUN] Processing candidates...\n")
        self.process_candidates()
        print("\n[DONE] Offer letter processing complete")


if __name__ == "__main__":
    agent = OfferLetterAgent()
    agent.run()
