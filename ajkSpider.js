const fs = require('fs');
const cheerio = require('cheerio');
const request = require('request');
const async = require('async');
const mysql  = require('mysql');  

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
        let info = $(e).find('.details-item.tag').text().trim().replace(//, '|').split('|'); // 获取房屋的基本信息,对其进行正则处理
        let addressStr = $(e).find('address').text().trim().replace(/\n/, ''); // 对房屋的地址信息进行正则处理
        let area = addressStr.match(/(^[^ ]*)|( .*$)/g)[1].trim().split(' '); // 对板块和具体地址信息进行分割处理

        topicObj.topicUrl = $(e).find('h3').find('a').attr('href'); // 房屋的详细信息
        topicObj.title = $(e).find('h3').find('a').attr('title'); // 房屋的标题信息
        topicObj.layout = info[0]; // 获取房型
        topicObj.acreage = info[1].replace('平米', ''); // 获取面积
        topicObj.floor = info[2]; // 获取楼层
        topicObj.village = addressStr.match(/(^[^ ]*)|( .*$)/g)[0].trim(); // 获得小区名字
        topicObj.plate = area[0];
        topicObj.address = area[1];
        topicObj.price = $(e).find('.zu-side').find('strong').text().trim();
        topicObj.type = $(e).find('.cls-1').text().trim();
        topicObj.orientations = $(e).find('.cls-2').text().trim();
        topicObj.metro = $(e).find('.cls-3').text().trim();

        topicArray.push(topicObj);
      });
      cb(null, pageIndex + '============完成');
      pageIndex++;
    });
  },(err, result) => {
      if (err) throw err;
      let connection = mysql.createConnection({     
        host     : 'localhost',       
        user     : 'root',              
        password : 'momo',       
        port: '3306',                   
        database: 'roomchart', 
      });
 
      connection.connect(); 
      let sql = 'INSERT IGNORE INTO tenement(url,title,layout,acreage,floor,village,plate,address,price,type,orientations,metro) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)';

      topicArray.forEach(topicObj => {
        connection.query(sql, [
            topicObj.topicUrl,
            topicObj.title,
            topicObj.layout,
            Number(topicObj.acreage),
            topicObj.floor,
            topicObj.village,
            topicObj.plate,
            topicObj.address,
            Number(topicObj.price),
            topicObj.type === '整租' ? 1 : 0,
            topicObj.orientations,
            topicObj.metro ? topicObj.metro : '无'
          ],
          function (err, result) {
            if(err){
             console.log('[INSERT ERROR] - ',err.message);
             return;
            }        
             
             console.log('--------------------------INSERT----------------------------');
             console.log('INSERT ID:',result);        
             console.log('-----------------------------------------------------------------\n\n');  
        });
      });
      if (callback) {
        callback(null, '基本信息分页页面完成');
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