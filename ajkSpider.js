const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const async = require('async');

// 通过shell命令获取分页的起始位置与结束位置索引
let pageArray = [];
let startIndex = process.argv[2];
let endIndex = process.argv[3];
for (let i = startIndex; i <= endIndex; i++) {
  let pageUrl = 'https://nj.zu.anjuke.com/fangyuan/p' + i;
  pageArray.push(pageUrl);
}

let topicArray = [];
function saveAllPage(callback) {
  let pageIndex = startIndex;
  async.map(pageArray, (url, cb) => {
    request({
      'url': url,
      'method': 'GET',
      'accept-charset': 'utf-8',
      'header': {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.84 Safari/537.36'
      }
    }, (err, res, body) => {
      if (err) cb(err, null);
      let $ = cheerio.load(res.body.toString());
      $('.zu-itemmod').each((i, e) => {
        let topicObj = {};
        let title = $(e).find('h3').find('a').attr('title'); // 房屋的标题信息
        let topicUrl = $(e).find('h3').find('a').attr('href'); // 房屋的详细信息
        let addressStr = $(e).find('address').text().trim().replace(/\n/, '');
        let location = addressStr.match(/(^[^ ]*)|( .*$)/g)[0].trim();
        let area = addressStr.match(/(^[^ ]*)|( .*$)/g)[1].trim();
        let price = $(e).find('.zu-side').find('strong').text();

        let fileName = price + '_' + location + '_' + area + '_' + title;
        topicObj.fileName = fileName;
        topicObj.topicUrl = topicUrl;
        topicArray.push(topicObj);
        if (!fs.existsSync('./rent_image/' + fileName)) {
            fs.mkdirSync('./rent_image/' + fileName);
        }

        console.log('=============== page ' + pageIndex + ' end =============');
        // cb(null, 'page ' + pageIndex);
        pageIndex++;
      });
    });
  },(err, result) => {
      if (err) throw err;
      console.log(topicArray.length);
      console.log(result + ' 完成');
      console.log('\n> 1 saveAllPage end');

      if (callback) {
        callback(null, 'task 1 saveAllPage');
      }
  });
}

function startDownload() {
  async.series([
    function (callback) {
      saveAllPage(callback);
    }
  ],
  function (err, results) {
    if (err) throw err;
    console.log(results);
  });
}

startDownload();