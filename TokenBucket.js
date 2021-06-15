/*Using TokenBucket with ip address for RateLimiting */

module.exports=class TokenBuckets{
    //bucket for saving ip addresses and timestamp of each user
    static Bucket=new Map();
    static TimeStamp=new Map();
    constructor(ExceedTime,TimeStamp,TokenIp,BucketSize){
        this.Token=BucketSize;
        this.tookenIp=TokenIp;
        this.exceedTime=ExceedTime;
        this.timeStamp=TimeStamp;
    }
    getToken(){
        return this.Token;
    }
    /*each user has a limited token to use the routes in a limited time if
    the user exceeds that limit it will return false otherwise return true  */
    TakeToken(){
        if(this.Token-1>0){
            if(this.timeStamp-this.exceedTime>0){
                return false;
            }
            this.Token=this.Token-1;
            return true;
        }
        return false;
    }
}