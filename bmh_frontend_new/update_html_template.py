import re

new_html_template = """const html = `
      <html>
        <head>
          <style>
            @page { margin: 0; size: auto; }
            body { font-family: monospace; width: 72mm; margin: 0; margin-left: 15px; margin-top: 15px; padding: 2px; color: #000; font-size: 12px; line-height: 1.3; }
            .header { text-align: center; margin-bottom: 2px; }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
            .subtitle { font-size: 9px; line-height: 1.2; }
            .dotted-line { border-bottom: 1px dashed #000; margin: 4px 0; }
            .ticket-title { text-align: center; font-weight: bold; text-decoration: underline; margin: 4px 0 8px 0; font-size: 13px; }
            
            .row { display: flex; align-items: flex-start; margin-bottom: 4px; }
            .row-spaced { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
            
            .label { display: inline-block; width: 75px; }
            .colon { margin-right: 6px; }
            
            .box { border: 1px solid #000; padding: 2px 6px; font-weight: bold; font-size: 14px; margin: 0 4px; }
            
            .footer-row { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; }
            .print-info { font-size: 9px; }
            .bmh { font-weight: bold; font-size: 14px; margin-right: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">BHARAT HEALTHCARE</div>
            <div class="subtitle">
              HOSPITAL ROAD , BARIPADA, MAYURBHANJ, ODISHA, PIN NO : 757001<br/>
              REGD. NO : MBJ/CE/03/2019, MOBILE NO : 8093110888
            </div>
          </div>
          <div class="dotted-line"></div>
          <div class="ticket-title">TEMPORARY APPOINTMENT TICKET</div>
          
          <div style="display: flex; align-items: center; justify-content: flex-start; margin-bottom: 8px; font-size: 11px;">
            <div style="display: flex; align-items: center; margin-right: 15px;">Slno : <span class="box">${printToken}</span></div>
            <div>Date : ${printDate}</div>
          </div>
          
          <div class="row">
            <span class="label">Name</span><span class="colon">:</span><span style="text-transform: uppercase;">${printPatient}</span>
          </div>
          
          <div class="row-spaced">
            <div>
              <span class="label">Age / Sex</span><span class="colon">:</span><span style="text-transform: uppercase;">${printAge} Yrs / ${printGender}</span>
            </div>
            <div>
              <span>MobNo : ${printMobile}</span>
            </div>
          </div>
          
          <div class="row">
            <span class="label">Address</span><span class="colon">:</span><span style="text-transform: uppercase;">${printCity || ''}</span>
          </div>
          
          <div style="border-bottom: 1px solid #000; margin: 6px 0; width: 35px;"></div>
          
          <div class="row">
            <span class="label">Doctor</span><span class="colon">:</span><span style="text-transform: uppercase;">DR ${printDoctor}</span>
          </div>
          
          <div class="row">
            <span class="label">Department</span><span class="colon">:</span><span style="text-transform: uppercase;">${printDept}</span>
          </div>
          
          <div class="row" style="margin-top: 4px;">
            <span class="label">Amount</span><span class="colon">:</span><span style="margin-left: 30px; font-weight: bold;">${printAmount}</span>
          </div>
          
          <div class="footer-row">
            <div class="print-info">Printed: ${nowStr} (p${currentPrintCount})</div>
            <div class="bmh">BMH</div>
          </div>
        </body>
      </html>
    `;"""

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the HTML block using regex
    pattern = r'const html = `.*?</html>\n\s*`;'
    
    if re.search(pattern, content, re.DOTALL):
        content = re.sub(pattern, new_html_template, content, flags=re.DOTALL)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"Could not find HTML block in {filepath}")

# Update both files
update_file(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-booking.tsx')
update_file(r'c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\employee\dashboard\patient-history.tsx')
