const { chromium } = require('playwright'); // Use chromium for Google Chrome
const notifier = require('node-notifier');
const fs = require('fs');
const readline = require('readline');
const constants = require('./config/constants');

async function promptConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (query) => new Promise((resolve) => rl.question(query, resolve));
  const defaultCookie = constants.cookies?.[0] || {};
  
  // Load saved config
  const savedConfig = constants.readSavedConfig();
  const savedTargetSite = savedConfig?.target_site || constants.target_site;
  const savedCookieValue = savedConfig?.cookie_value || defaultCookie.value || '';
  
  // Show saved value indicator
  const targetSitePrompt = savedConfig?.target_site 
    ? `Slack target URL [${savedTargetSite}] (saved): `
    : `Slack target URL [${constants.target_site}]: `;
  const cookieValuePrompt = savedConfig?.cookie_value
    ? `Slack cookie "d" value [hidden saved value]: `
    : `Slack cookie "d" value [hidden default]: `;

  const targetSiteInput = await ask(targetSitePrompt);
  const cookieValueInput = await ask(cookieValuePrompt);
  const bidMsgInput = await ask(`Bid message (press Enter to keep default) [multiline allowed, end with Enter]:\n`);

  rl.close();

  // Determine final values (use input if provided, otherwise use saved/default)
  const finalTargetSite = targetSiteInput.trim() || savedTargetSite;
  const finalCookieValue = cookieValueInput.trim() || savedCookieValue;

  // Save config values to file (only if changed)
  const configSaved = constants.saveConfig(finalTargetSite, finalCookieValue);
  if (configSaved) {
    console.log(`Config saved to ${constants.config_file}`);
  }

  // Save bid message to file if user provided input
  const bidMessage = bidMsgInput.trim() || constants.bid_msg_templete;
  if (bidMsgInput.trim()) {
    try {
      fs.writeFileSync(constants.bid_message_file, bidMessage, 'utf8');
      console.log(`Bid message saved to ${constants.bid_message_file}`);
    } catch (error) {
      console.error('Error saving bid message:', error);
    }
  }

  return {
    target_site: finalTargetSite,
    cookies: [
      {
        ...defaultCookie,
        name: defaultCookie.name || 'd',
        value: finalCookieValue,
        domain: defaultCookie.domain || '.slack.com',
        path: defaultCookie.path || '/',
        httpOnly: defaultCookie.httpOnly ?? true,
        secure: defaultCookie.secure ?? true,
        sameSite: defaultCookie.sameSite || 'Lax',
      },
    ],
    bid_msg_templete: bidMessage,
    logfile: constants.logfile,
  };
}

var counter = 3063;

(async () => {
  const { target_site, cookies, bid_msg_templete, logfile } = await promptConfig();
  const browser = await chromium.launch({ headless: false }); // Run in non-headless mode for debugging
  const context = await browser.newContext({
    viewport: { width: 1200, height: 650 }, // Set the viewport size
  });

  try {

    // Add cookies to the context
    await context.addCookies(cookies);

    // Create a new page within the context
    const page = await context.newPage();

    // Navigate to the Slack page
    await page.goto(target_site, {
      waitUntil: 'networkidle',
    });
 
    console.log('Page loaded and network idle');
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait to ensure everything is loaded

    
    // Click the "Most recommended" dropdown button
    const mostRecommendedButton = await page.$('button[data-qa="sort-explorer-select"]');
    if (mostRecommendedButton) {
      await mostRecommendedButton.click();
      console.log('Dropdown clicked.');
    } else {
      throw new Error('Dropdown button not found');
    }

    // Wait for the dropdown options to appear
    // await new Promise((resolve) => setTimeout(resolve, 10000)); // Ensure dropdown options are visible
    await page.waitForSelector('.c-select_options_list__option', { timeout: 10000 });

    // Select the "A to Z" option by clicking on its text
    const aToZOption = await page.$('span.c-truncate:text("Z to A")');
    if (aToZOption) {
      await aToZOption.click();
      console.log('Selected "Z to A".');
    } else {
      throw new Error('"A to Z" option not found');
    }
    //first click
    await page.click('.p-explorer_grid__cell');
    await sliterMove(page);

    await new Promise((resolve) => setTimeout(resolve, 5000)); // Ensure dropdown options are visible

    var pageNumber = 1;
    await pageOver(page, pageNumber);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    var startNumber = 1;
    while(1){
        const rows = await page.$$('.p-grid__rowgroup');
        console.log(`Found ${rows.length} rows.`);

        for (let i = startNumber; i < rows.length; i++) {
            console.log(`Processing row ${i + 1}`);

            const row = await page.$(`.p-grid__rowgroup:nth-child(${i + 1})`);
            if (!row) {
                console.warn(`Row ${i + 1} is no longer attached to the DOM.`);
                continue;
            }
            const cells = await row.$$('.p-explorer_grid__cell');
            console.log(`Row ${i + 1} contains ${cells.length} cells.`);

            for (let j = 0; j < cells.length; j++) {
                console.log(`Processing cell ${j + 1} in row ${i + 1}`);
                const cellSelector = `.p-explorer_grid__cell:nth-child(${j + 1})`;
                // const cell = await row.$(`.p-explorer_grid__cell:nth-child(${j + 1})`);
                const cell = await row.$(cellSelector);

                if (!cell) {
                    console.warn(`Cell ${j + 1} in row ${i + 1} is no longer attached to the DOM.`);
                continue;
                }

                try {
                   await cell.click();
                  console.log(`Clicked cell ${j + 1} in row ${i + 1}`);
                  await performCellActions(page,pageNumber, i,j, bid_msg_templete, logfile);
                } catch (error) {
                  console.error(`Error interacting with cell ${j + 1} in row ${i + 1}:`, error);
                }
                await new Promise((resolve) => setTimeout(resolve, 2000))
            }
            
            console.log("pageNumber:", pageNumber)
        }
        
        startNumber = 0;
        console.log('Grid processed.');
        const buttons = await page.$$('.c-button-unstyled.c-pagination__page_btn');
        let clicked = false; // Track if a button was clicked
        for (const button of buttons) {
            const text = await page.evaluate(el => el.textContent.trim(), button);
            if (Number(text) === pageNumber +1) {
                await button.click();
                await new Promise((resolve) => setTimeout(resolve, 3000)); 
                console.log(`Button with text ${pageNumber+1} clicked successfully.`);
                clicked = true;
                break;
            }
        }
        console.log("pageNumber:", pageNumber)
        pageNumber++;
    }

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();

async function pageOver(page, targetPageNumber) {
  let currentPage = 1; // Assuming you start on page 1
  while (currentPage !== targetPageNumber) {
      const buttons = await page.$$('.c-button-unstyled.c-pagination__page_btn');
      let buttonClicked = false;

      for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent.trim(), button);
          const pageNumber = Number(text);

          // Navigate in steps of 2
          if (pageNumber === currentPage + 2 && currentPage + 2 <= targetPageNumber) {
              await button.click();
              console.log(`Navigated to page ${currentPage + 2}`);
              currentPage += 2;
              buttonClicked = true;
              break;
          } else if (pageNumber === currentPage - 2 && currentPage - 2 >= targetPageNumber) {
              await button.click();
              console.log(`Navigated to page ${currentPage - 2}`);
              currentPage -= 2;
              buttonClicked = true;
              break;
          }

          // Adjust to exact target if it's within 1 step
          if (pageNumber === targetPageNumber) {
              await button.click();
              console.log(`Navigated directly to page ${targetPageNumber}`);
              currentPage = targetPageNumber;
              buttonClicked = true;
              break;
          }
      }

      if (!buttonClicked) {
          throw new Error(`Failed to navigate to the target page: ${targetPageNumber}`);
      }

      // Wait for the page to load
      await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log(`Successfully navigated to page ${targetPageNumber}`);
}

async function performCellActions(page,pageNumber,i,j, bid_msg_templete, logfile) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for UI changes
    const localTimeSelector = '.p-local_time__text';
    await page.waitForSelector(localTimeSelector);
    const localTimeText = await page.textContent(localTimeSelector);
    var isIndia = compairIndiaTime(localTimeText);

    const emailSelector = '.p-autoclog__hook .c-link';
    // await page.waitForSelector(emailSelector);
    // const emailText = await page.textContent(emailSelector);
    // var isMail = extracteMail(emailText);
    const emailText = "test@test.com";
    const isMail = false;

    try {
      if(!isMail && !isIndia) {
          const messageButtonSelector = '.c-button.c-button--outline.c-button--medium.p-member_profile_buttons__button';
          await page.waitForSelector(messageButtonSelector);
          await page.click(messageButtonSelector);
          console.log('Message button clicked.');
          await new Promise((resolve) => setTimeout(resolve, 4500)); // Wait for input to appear
      
          const messageInputSelector = '[data-qa="message_input"] .ql-editor[contenteditable="true"]';
          const sendButtonSelector = '[data-qa="texty_send_button"]';
      
          await page.waitForSelector(messageInputSelector);
          await page.fill(messageInputSelector, bid_msg_templete);
          console.log('Message inserted.');
      
          await page.waitForSelector(sendButtonSelector);
          await page.click(sendButtonSelector);
          console.log('Message sent.');
          counter++;
          saveFile(pageNumber,i,j,`success  ${counter}`, logfile) 
      } else {
        saveFile(pageNumber,i,j,emailText+"  "+isIndia, logfile) 
      }
    } catch (error) {
      notifier.notify({
        title: 'Playwright Notification',
        message: "Failed",  // This is the message you want to display
        // icon: path.join(__dirname, 'icon.png'), // Optional: path to your custom icon
        // sound: true, // Optional: enable sound
      });
    }
    console.log("Mail   ", isMail, "india   ", isIndia);
    console.log(`Email: ${emailText}, Local Time: ${localTimeText}`);
    await page.keyboard.press('Alt+ArrowLeft');
    console.log('Navigated back.');
    // await page.goBack({ waitUntil: 'networkidle' });
    // console.log('Navigated back using page.goBack().');
  } catch (error) {
    console.error('Error performing actions on cell:', error);
  }
}

function compairIndiaTime(localTimeText) {
  const localTimeMatch = localTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!localTimeMatch) return 'Could not parse local time.';
  let localHour = parseInt(localTimeMatch[1], 10);
  const localMinute = parseInt(localTimeMatch[2], 10);
  const localPeriod = localTimeMatch[3]?.toUpperCase();

  if (localPeriod === 'PM' && localHour !== 12) localHour += 12;
  if (localPeriod === 'AM' && localHour === 12) localHour = 0;

  const indiaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
  const [indiaHour, indiaMinute] = indiaTime.split(' ')[1].split(':').map(Number);

  return localHour === indiaHour && localMinute === indiaMinute ? true : false;
}

function extracteMail(emailText) {
  if (emailText.includes('@shopify.com')) return true;
  return false;
}

function saveFile(number,i,j, isSuccess, logfile)
{
    const filePath = logfile; // The file where the data will be saved
    const content = `number: ${number}, i: ${i}, j: ${j},  ${isSuccess}\n`; // Format the content as a string

    // Save the data to the file
   fs.appendFile(filePath, content, (err) => {
    if (err) {
        console.error('Error saving data to file:', err);
    } else {
        console.log(`Data saved successfully to ${filePath}`);
    }
    });
}

async function sliterMove(page){//spliter move
  const resizer = await page.$('.p-resizer.p-ia4_client__resizer.p-ia4_client__resizer--sidebar');

  // Get the current position of the element
  const box = await resizer.boundingBox();
  const initialX = box.x;
  const initialY = box.y;

  // Move the mouse to the element's position, click, and drag 100px to the right
  await page.mouse.move(initialX + 5, initialY + 5); // Move the mouse to a point near the top-left corner
  await page.mouse.down(); // Press and hold the mouse button
  await page.mouse.move(initialX + 145, initialY + 5); // Move the mouse 100px to the right
  await page.mouse.up(); // Release the mouse button

  // Optionally, you can add a delay to see the result before closing the browser
  await page.waitForTimeout(7000);
}