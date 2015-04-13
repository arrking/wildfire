/*
 * Wechat I/O Backend
 */
var wechat = require('wechat');
var common = require('../common');
var logger = common.loggerUtil.getLogger("wechat");
var superagent = require('superagent');
var u = require('util');
var Q = require('q');
var wxSign = require("weixin-signature").sign;
var redisq = require('../persistence/redisq');
var wxCfg = require('../wechat-gzh.json');

// function _postWXEvent(msg) {
//     reflux.post('/collections/WXEvents', {
//         openId: msg.FromUserName,
//         creationDate: (new Date()),
//         payload: msg
//     });
// }

function _saveUserProfileDataByOpenId(openId) {
    logger.debug('_saveUserProfileDataByOpenId', 'start to save OpenID: ' + openId);
    var defer = Q.defer();
    _getWxAccessTokenFromRedis()
        .then(function(accessToken) {
            var url = u.format('https://api.weixin.qq.com/cgi-bin/user/info?access_token=%s&&openid=%s',
                accessToken, openId);
            logger.debug('_saveUserProfileDataByOpenId', url);
            superagent.get(url)
                .set('Accept', 'application/json')
                .end(function(err, resp) {
                    if (err) {
                        logger.error('_saveUserProfileDataByOpenId', err);
                        throw new Error('Can not get profile data.');
                    } else {
                        logger.debug(JSON.stringify(resp));
                        /**
                         * Get an error POST /collections/WXUsers 400 when
                         * an user unscribe first, and later subscribe again.
                         * #TODO need to handle this error with reflux's promise
                         * There are two solution, check user by UnionID before post
                         * or change to put after getting the duplicated key error.
                         */
                        reflux.post('/collections/WXUsers', resp.body);
                    }
                });
        })
        .fail(function(err) {
            logger.error(err);
        })
        .done();

    return defer.promise;
}

function onSubscribe(msg, res) {
    // get user profile data with RESt API
    // _saveUserProfileDataByOpenId(msg.FromUserName);
    res.reply([{
        title: '注册账号',
        description: '使用微信登陆呱呱叫。',
        picurl: 'http://wildfire-staging.arrking.com/public/images/frog-icon.png',
        url: 'http://wildfire-staging.arrking.com/'
    }]);
}

function onUnsubscribe(msg, res) {
    res.send(200);
}

function onClick(msg, res) {
    // process menu event
    switch (msg.EventKey) {
        case 'click/mobay':
            res.reply([{
                title: '移动港湾',
                description: '在连锁咖啡厅中，使用室内定位技术，创建近场社交网络，衍生新的服务模式。',
                picurl: 'http://niobe.arrking.com/images/wechat-arrking-gzh/1.jpg',
                url: 'http://mp.weixin.qq.com/s?__biz=MjM5ODcwMjk3Nw==&mid=204799786&idx=1&sn=a76468c814a2fc51c80d7ac438a16552&scene=1&key=0ce8fa93c80e41c52fc1189fd191817ae2b34182b1b374231381198b9ad9a4fd0f6b65754fe356b328f8159fba844706&ascene=0&uin=MjQ2NjQyOTE1&devicetype=iMac+MacBookPro11%2C1+OSX+OSX+10.10.2+build(14C109)&version=11020012&pass_ticket=EKJtkxZp4Nz4dZ%2FG4%2FX%2F1LIl08FbzHtgrDWEN86QCho%3D'
            }, {
                title: '微信版',
                description: '关注金矢科技公众号，得到微信版移动港湾。',
                picurl: 'http://niobe.arrking.com/images/wechat-arrking-gzh/2.png',
                url: 'http://niobe.arrking.com/mapps/mobay/'
            }, {
                title: 'iOS版',
                description: '通过苹果应用商店下载。',
                picurl: 'http://niobe.arrking.com/images/wechat-arrking-gzh/2.png',
                url: 'http://eqxiu.com/s/BJPFYR'
            }, {
                title: 'O2O解决方案',
                description: '餐饮O2O解决方案。',
                picurl: 'http://niobe.arrking.com/images/wechat-arrking-gzh/3.png',
                url: 'http://deck.arrking.com/decks/delivery-services-in-mobay/index.html#/'
            }]);
            break;
        case 'click/contact_me':
            res.reply({
                content: '合作交流，业务外包等，请致电王先生垂询，联系电话 15801213126 。',
                type: 'text'
            });
            break;
        case 'click/zhaoxianling':
            res.reply([{
                title: '携手共创辉煌',
                description: '央视日前热播《互联网时代》，短短四十年间 ...',
                picurl: 'http://arrking.qiniudn.com/wechat-article-pic-entrepreneur.png',
                url: 'http://mp.weixin.qq.com/s?__biz=MjM5ODcwMjk3Nw==&mid=201694225&idx=1&sn=6ec3a9af6e0d39ec81b3b91cdcd7ca95#rd'
            }]);
            break;
        default:
            logger.warn('onClick', msg);
            res.send(200);
            break;
    }
}

function onDefault(msg, res) {
    // body...
    logger.warn('onDefault', msg);
    res.reply({
        content: '我们收到了您的消息，本回复为自动回复。您的请求正在由服务人员处理，稍后与您联系。',
        type: 'text'
    });
}

exports.setup = function(app, path) {
    app.use(path, wechat('wiUtuddAk3', function(req, res, next) {
        // message is located in req.weixin
        var message = req.weixin;
        // _postWXEvent(message);
        // TODO
        // post the data into database
        // superagent.post()

        switch (message.Event) {
            case 'CLICK':
                onClick(message, res);
                break;
            case 'subscribe':
                onSubscribe(message, res);
                break;
            case 'unsubscribe':
                onUnsubscribe(message, res);
                break;
            default:
                // other events, check out
                // http://mp.weixin.qq.com/wiki/2/5baf56ce4947d35003b86a9805634b1e.html
                onDefault(message, res);
                break;
        }
    }));
}

function _getWxAccessToken() {
    var defer = Q.defer();
    superagent.get(u.format('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s',
            wxCfg.appId, wxCfg.appSecret))
        .end(function(err, res) {
            if (err) {
                defer.reject(err);
            } else if (res.statusCode !== 200) {
                defer.reject(res);
            } else {
                // res format
                // { access_token: 'xxx',
                // expires_in: 7200 }
                defer.resolve(res.body);
            }
        });
    return defer.promise;
}

function _getWxJsapiTicketByAccessToken(accessToken) {
    var defer = Q.defer();
    superagent.get(u.format('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=%s&type=jsapi', accessToken))
        .end(function(err, res) {
            if (err) {
                defer.reject(err);
            } else if (res.statusCode !== 200) {
                /**
                 * res format
                 * {"errcode":0,"errmsg":"ok",
                 * "ticket":"xxxx","expires_in":7200}
                 */
                defer.reject(res);
            } else {
                defer.resolve(res.body);
            }
        })
    return defer.promise;
}

function _getSignatureByJspApiTicketAndUrl(jsapi_ticket, url) {
    return wxSign({
        noncestr: noncestr = 'xxxxxxxxyyyyy'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : r & 0x3 | 0x8;
            return v.toString(16);
        }),
        timestamp: Math.floor(Date.now() / 1000).toString(),
        jsapi_ticket: jsapi_ticket,
        url: url
    });
}

function _getWxAccessTokenFromRedis() {
    var defer = Q.defer();
    redisq.getWxAccessToken()
        .then(function(data) {
            logger.debug('getWxAccessTokenFromRedis', 'access_token is retrieved from redis.');
            if (logger.isLevelEnabled('DEBUG')) {
                redisq.getWxAccessTokenTTL()
                    .then(function(ttl) {
                        logger.debug(u.format('accessToken time to live %d seconds.', ttl));
                    }, function(err) {
                        logger.warn(err);
                    })
            }
            return data;
        }, function(err) {
            return _getWxAccessToken();
        })
        .then(function(v) {
            if (typeof v == 'object' && v.access_token && v.expires_in) {
                // retrieved from WX and save into redis
                return redisq.setWxAccessToken(v);
            } else {
                defer.resolve(v);
                return;
            }
        }, function(err) {
            // _getWxAccessToken throws an err
            defer.reject(err);
            return;
        }).then(function(result) {
            /**
             * redisq setWxAccessToken get fullfiled.
             * @param  {string} result accessToken value
             * @return {string} result accessToken value
             */
            if (result) {
                logger.debug('getWxAccessTokenFromRedis', 'accessToken is updated.');
                defer.resolve(result);
            }
        })
        .fail(function(e) {
            /**
             * redisq.setWxAccessToken throw err
             * print to logging.
             * @param  {[type]}
             * @return {[type]}
             */
            if (!(defer.isFulfilled() || defer.isRejected())) {
                logger.error(e);
                defer.reject(e);
            }
        });

    return defer.promise;
}


function _getWxJsapiTicketFromRedis() {
    var defer = Q.defer();
    redisq.getWxJsapiTicket()
        .then(function(jsApiTicket) {
            logger.debug('getWxJsapiTicketFromRedis', u.format('%s is retrieved from redis.', jsApiTicket));
            if (logger.isLevelEnabled('DEBUG')) {
                redisq.getWxJsapiTicketTTL()
                    .then(function(ttl) {
                        logger.debug(u.format('jspApiTicket time to live %d seconds.', ttl));
                    }, function(err) {
                        logger.error('getWxJsapiTicketFromRedis', err);
                    })
            }
            defer.resolve(jsApiTicket);
            return;
        }, function(err) {
            // no jsApiTicket in redis ?
            return _getWxAccessTokenFromRedis();
        })
        .then(function(accessToken) {
            if (accessToken)
                return _getWxJsapiTicketByAccessToken(accessToken);
            return;
        }, function(err2) {
            // _getWxAccessTokenFromRedis throw an error
            logger.error('getWxJsapiTicketFromRedis', err2);
            defer.reject('_getWxAccessTokenFromRedis fail to resolve accessToken.');
            return;
        })
        .then(function(result) {
            if (result) {
                // get new jsApiTicket
                // TODO save into redis
                // defer.resolve(result.ticket);
                return redisq.setWxJsapiTicket(result);
            }
        }, function(err3) {
            // _getWxJsapiTicketByAccessToken throw an error
            logger.error(err3);
            defer.reject(err3);
            return;
        })
        .then(function(val) {
            /**
             * redisq.setWxJsapiTicket(result) fullfiled
             * @param  {string}
             * @return {}
             */
            if (val) {
                defer.resolve(val);
            }
        }, function(err4) {
            // setWxJsapiTicket throw an error
            logger.error(err4);
            defer.reject(err4);
        })
        .done();

    return defer.promise;
}

/**
 * Get a access token for debugging wechat API
 * @param  {[type]} doc){                 console.log('wechat access token: ' + doc);} [description]
 * @return {[type]}        [description]
 */
_getWxAccessTokenFromRedis().then(function(doc) {
    console.log('wechat access token: ' + doc);
});

exports.getWxAccessTokenFromRedis = _getWxAccessTokenFromRedis;
exports.getWxJsapiTicketFromRedis = _getWxJsapiTicketFromRedis;
exports.getSignatureByJspApiTicketAndUrl = _getSignatureByJspApiTicketAndUrl;