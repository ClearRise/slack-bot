const fs = require('fs');
const path = require('path');

exports.logfile = 'logs/data.txt';
exports.bid_message_file = 'config/bid_message.txt';
exports.config_file = 'config/config.json';

exports.target_site = 'https://app.slack.com/client/T577B1P34/C5CDN7GBV';

exports.cookies = [
    {
      name: 'd',
      value: 'xoxd-bmvYtVLSQW%2F4NAg3S4ejwkn3se2vqh5WeFoQ5zqlpxDkPERqiWvMY90%2FxUKxB7AJRglc3ZwjV5624Ixs%2FDeieyH7BVVnX%2FfAVS1pthSAUpPXSRbs3EdFSy4lrbzMep%2BGi31nD5pTHL%2F70LASTjZfECbK82MjlA7Vcs8SRqNPqpTSo8xcltPLY338tLj3Loi7F70s51es%2BzgmrL5JZPheQccugIg%3D',
      domain: '.slack.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    }
  ];

// Read saved config from file
function readSavedConfig() {
  try {
    const filePath = path.join(__dirname, 'config.json');
    if (fs.existsSync(filePath)) {
      const configData = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('Error reading config file:', error);
  }
  return null;
}

// Save config to file (only if values have changed)
function saveConfig(targetSite, cookieValue) {
  try {
    const filePath = path.join(__dirname, 'config.json');
    const existingConfig = readSavedConfig();
    
    // Check if values have changed
    const hasChanged = !existingConfig || 
      existingConfig.target_site !== targetSite || 
      existingConfig.cookie_value !== cookieValue;
    
    if (hasChanged) {
      const configData = {
        target_site: targetSite,
        cookie_value: cookieValue,
        saved_at: new Date().toISOString()
      };
      fs.writeFileSync(filePath, JSON.stringify(configData, null, 2), 'utf8');
      return true; // Indicates save was performed
    }
    return false; // Indicates no save was needed
  } catch (error) {
    console.error('Error saving config file:', error);
    return false;
  }
}

exports.readSavedConfig = readSavedConfig;
exports.saveConfig = saveConfig;

// Read bid message from file
function readBidMessage() {
  try {
    const filePath = path.join(__dirname, 'bid_message.txt');
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
  } catch (error) {
    console.error('Error reading bid message file:', error);
  }
}

exports.bid_msg_templete = readBidMessage();
