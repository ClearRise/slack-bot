const { chromium } = require('playwright'); // Use chromium for Google Chrome

(async () => {
  const browser = await chromium.launch({ headless: false }); // Run in non-headless mode for debugging
  const context = await browser.newContext({
    viewport: { width: 1366, height: 650 }, // Set the viewport size to 1366x768
  });

  try {
    // Add relevant cookies (replace with actual cookie values)
    const cookies = [
      {
        name: 'd',
        value: 'xoxd-mmw%2F7jDuPHwkKUpC7jZTVf7HDUTk53i7DuT07Q7kem31nvP%2FR6yQP4eFD0kxIe7RBrgCPMXElIbUWbnJx2EM%2BapsWdBNKLREO7t0fvn0XLsYd8Lqqt%2Fv%2BLBntuSRiloHAzQ49n9xHJJFoUcGSWCjw6EEY4BaMmj2%2BRrm%2Fjaly6Xrfb0hBFazQ33lx4v%2FJNtpjcqA2LY%3D',
        domain: '.slack.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'x',
        value: '85cc2b7837b60e9796a22f64ed0d9b49.1736607577',
        domain: '.slack.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'ec',
        value: 'enQtODI5MDM1MDEwMTMyOS02NWY4NDkxOGVkNDhlZmQ2NmNlYTU5NmFiZGE5ZjBmMDkwZjkzMGEyNTcwZmQ4NmI4NjUwM2ZlNzJhZjE5OTk1',
        domain: '.slack.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ];

    // Add cookies to the context
    await context.addCookies(cookies);

    // Create a new page within the context
    const page = await context.newPage();

    // Navigate to the Slack page
    await page.goto('https://app.slack.com/client/T4BB7S7HP/people/', {
      waitUntil: 'networkidle',
    });

    // Step 2: Wait for 20 seconds for elements to load
    await new Promise((resolve) => setTimeout(resolve, 20000));

    console.log('Page loaded and network idle');

    // Step 4: Click the "Most recommended" dropdown button
    const mostRecommendedButton = await page.$('button[data-qa="sort-explorer-select"]');
    if (mostRecommendedButton) {
      await mostRecommendedButton.click(); // Open the dropdown
      console.log('Dropdown clicked.');
    } else {
      throw new Error('Dropdown button not found');
    }

    // Step 5: Wait for the dropdown options to appear
    await page.waitForSelector('.c-select_options_list__option', { timeout: 5000 });

    // Step 6: Select the "A to Z" option by clicking on its text
    const aToZOption = await page.$('span.c-truncate:text("A to Z")');
    if (aToZOption) {
      await aToZOption.click(); // Select "A to Z"
      console.log('Selected "A to Z".');
    } else {
      throw new Error('"A to Z" option not found');
    }

    // Optional: Take a screenshot to verify the selection
    await new Promise((resolve) => setTimeout(resolve, 20000));
    await page.screenshot({ path: 'slack_a_to_z_selected.png' });
    console.log('Screenshot saved.');
    await page.click('.p-explorer_grid__cell');
    console.log('firstclick');
    // Step 7: Wait for the grid to load
    await page.waitForSelector('.p-grid__container.p-explorer_grid', { timeout: 10000 });

    // Select all rows in the grid
    
    const rows = await page.$$('.p-grid__container.p-explorer_grid .p-grid__rowgroup');
    console.log(`Found ${rows.length} rows.`);

    let cellIndex = 0;

    // Step 8: Iterate through each row and cell
    for (let i = 0; i < rows.length; i++) {
    //   console.log(`Processing row ${i + 1}`);
      const row = rows[i];

      // Select all cells in the current row
      await page.waitForSelector('.p-explorer_grid__cell'); 
      const cells = await row.$$('.p-explorer_grid__cell');
    //   console.log(`Row ${i + 1} contains ${cells.length} cells.`);

      for (let j = 0; j < cells.length; j++) {
        cellIndex++;
        // console.log(`Processing cell ${cellIndex} in row ${i + 1}`);
        const cell = cells[j];

        // Perform an action on each cell, e.g., clicking or extracting text
        const cells = await page.$$('.p-explorer_grid__cell');
        await cell.click(); // Adjust based on your requirements
        //check India
        {
            const localTimeSelector = '.p-local_time__text';
            await page.waitForSelector(localTimeSelector); // Ensure the element is visible
            const localTimeText = await page.textContent(localTimeSelector);
            const isIndia = compairIndiaTime(localTimeText)
            console.log(isIndia)
        }
        //check RB, shopify
        {
            const emailSelector = '.p-autoclog__hook .p-r_member_profile__container .p-r_member_profile_section .p-rimeto_member_profile_field__contact_info .p-rimeto_member_profile_field .p-rimeto_member_profile_field__primary .p-rimeto_member_profile_field__value .c-link';
            await page.waitForSelector(emailSelector); // Ensure the element is visible
            const emailText = await page.textContent(emailSelector);
            const isRb_Shopify = extracteMail(emailText);
            console.log(isRb_Shopify);
         
        }
        //click message button 
        {
            const buttonSelector = '.c-button.c-button--outline.c-button--medium.p-member_profile_buttons__button';
  
            await page.waitForSelector(buttonSelector); // Ensure the button is visible
            await page.click(buttonSelector); // Click the button

            console.log('Button clicked successfully!');
            await new Promise((resolve) => setTimeout(resolve, 15000));

        }
        //insert bid
        {
            const messageInputSelector = '[data-qa="message_input"] .ql-editor[contenteditable="true"]';

            await page.waitForSelector(messageInputSelector); // Wait until the editor is ready

            // Type a message into the contenteditable div
            const message = 'Hello, 00010cents!';
            await page.fill(messageInputSelector, message); // This will insert the text into the editor

            console.log('Message inserted successfully!');
            await new Promise((resolve) => setTimeout(resolve, 5000));

        }
        //send bid
        {
            const buttonSelector = '[data-qa="texty_send_button"]';
            await page.waitForSelector(buttonSelector); // Ensure the button is visible
            await page.click(buttonSelector); // Click the button
            console.log('Send button clicked successfully!');
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
        //come back
        {
            await page.keyboard.press('Alt+ArrowLeft'); // Simulate pressing Alt + Left Arrow
            console.log('Alt + Left Arrow pressed!');
        }

        await new Promise((resolve) => setTimeout(resolve, 5000)); // Add delay if needed

        // Optionally, extract the text content
        const textContent = await cell.textContent();
        // console.log(`Cell ${cellIndex} content: ${textContent}`);
      }
    }

    // Optional: Take a screenshot of the page after processing
    await page.screenshot({ path: 'grid_processed.png' });
    console.log('Grid processed screenshot saved.');
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();

function compairIndiaTime(localTimeText)
{
    // Extract hour, minute, and AM/PM from the local time text
    const localTimeMatch = localTimeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!localTimeMatch) {
      console.error('Could not parse local time.');
      return;
    }
    let localHour = parseInt(localTimeMatch[1], 10);
    const localMinute = parseInt(localTimeMatch[2], 10);
    const localPeriod = localTimeMatch[3]?.toUpperCase();
  
    // Adjust hour for PM times
    if (localPeriod === 'PM' && localHour !== 12) {
      localHour += 12;
    }
    // Handle 12 AM case
    if (localPeriod === 'AM' && localHour === 12) {
      localHour = 0;
    }
  
    // Get current Indian time (hour and minute)
    const indiaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false });
    const [indiaHour, indiaMinute] = indiaTime.split(' ')[1].split(':').map(num => parseInt(num, 10));
  
    // Compare the hour and minutes
    if (localHour === indiaHour && localMinute === indiaMinute) {
      return "india"
    } else {
      return "noIndia"
    }
}

function extracteMail(emailText) {
    // Determine the domain of the email
    console.log(emailText);
    if (emailText.includes('@gmail.com') | emailText.includes('@shopify.com')) {
      return "Rb or shopify mail"
    } else {
      return "different domain"
    }
}
