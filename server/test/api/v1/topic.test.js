var app = require('../../../wildfire');
var request = require('supertest')(app);
var should = require('should');
var support = require('../../support/support');


describe('test/api/v1/topic.test.js', function() {
    var mockUser, mockTopic;
    before(function(done) {
        support.createUser(function(err, user) {
            mockUser = user;
            support.createTopic(user.id, function(err, topic) {
                mockTopic = topic;
                done();
            })
        })
    })

    describe('get /api/v1/topics', function() {
        it('should return topics', function(done) {
            request.get('/api/v1/topics')
                .end(function(err, res) {
                    should.not.exists(err);
                    res.body.data.length.should.above(0);
                    done();
                });
        });

        it('should return topics', function(done) {
            request.get('/api/v1/topics')
                .query({
                    limit: 2
                })
                .end(function(err, res) {
                    should.not.exists(err);
                    res.body.data.length.should.equal(2);
                    done();
                });
        });
    });

    describe('get /api/v1/topic/:topicid', function() {
        it('should return topic info', function(done) {

            request.get('/api/v1/topic/' + mockTopic.id)
                .end(function(err, res) {
                    should.not.exists(err);
                    res.body.data.id.should.equal(mockTopic.id);
                    done();
                })
        })
    })

    // it should create a topic records
    describe('post /api/v1/topics', function() {
        it('should create a topic', function(done) {
            // set goods parameters
            var goods_pics = ['pic 1 link', 'pic 2 link'],
                goods_pre_price = 2000,
                goods_now_price = 1000,
                goods_is_bargain = true,
                goods_quality_degree = '全新',
                goods_exchange_location = {
                    lng: '181.111',
                    lat: '291.100',
                    txt: '北京海淀'
                },
                goods_status = '在售';


            request.post('/api/v1/topics')
                .send({
                    accesstoken: mockUser.accessToken,
                    title: '我是 api 测试小助手',
                    tab: 'share',
                    content: '我也是 api 测试小助手',
                    // goods parameters
                    goods_pics: goods_pics,
                    goods_pre_price: goods_pre_price,
                    goods_is_bargain: goods_is_bargain,
                    goods_quality_degree: goods_quality_degree,
                    goods_exchange_location: goods_exchange_location,
                    goods_status: goods_status
                })
                .end(function(err, res) {
                    should.not.exists(err);
                    res.body.success.should.true;
                    res.body.topic_id.should.be.String;
                    done();
                })
        })
    })

    describe('post /api/v1/topic/collect', function() {
        it('should collect topic', function(done) {
            request.post('/api/v1/topic/collect')
                .send({
                    accesstoken: mockUser.accessToken,
                    topic_id: mockTopic.id
                })
                .end(function(err, res) {
                    should.not.exists(err);
                    res.body.should.eql({
                        "success": true
                    });
                    done();
                })
        });

        it('do nothing when topic is not found', function(done) {
            request.post('/api/v1/topic/collect')
                .send({
                    accesstoken: support.normalUser.accessToken,
                    topic_id: mockTopic.id + 'not_found'
                })
                .end(function(err, res) {
                    should.not.exists(err);
                    res.status.should.equal(500);
                    done();
                })
        });
    })

    describe('post /api/v1/topic/de_collect', function() {
        it('should de_collect topic', function(done) {
            request.post('/api/v1/topic/de_collect')
                .send({
                    accesstoken: mockUser.accessToken,
                    topic_id: mockTopic.id
                })
                .end(function(err, res) {
                    should.not.exists(err);
                    res.body.should.eql({
                        "success": true
                    });
                    done();
                })
        });

        it('do nothing when topic is not found', function(done) {
            request.post('/api/v1/topic/de_collect')
                .send({
                    accesstoken: support.normalUser.accessToken,
                    topic_id: mockTopic.id + 'not_found'
                })
                .end(function(err, res) {
                    should.not.exists(err);
                    res.status.should.equal(500);
                    done();
                })
        });
    })
})
