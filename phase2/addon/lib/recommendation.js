

const Recommendation = function (options) {
  nRecommendation = {
    id: options.id,
    trigBehavior: options.trigBehavior || "",
    feature: options.feature,
    classTags: options.classTags,
    delivContext: options.delivContext || "",
    presentationData: options.presentationData,
    respCommandMap: options.respCommandMap,
    toString: function (){
      that = this
      return Object.keys(this).reduce(function(previousValue, currentValue, index, array) {
        
        return previousValue + "\n" + currentValue + "-> " + that[currentValue];
      }, "");
    }
  }

  return nRecommendation;


}



exports.Recommendation = Recommendation;