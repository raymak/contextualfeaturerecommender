

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
      let that = this;
      return Object.keys(this).reduce(function (previousValue, currentValue, index, array) {
        
        if (typeof that[currentValue] === "function")
          return previousValue;
        
        return previousValue + "\n" + currentValue + "-> " + that[currentValue];
      }, "");
    }
  }

  return nRecommendation;


}



exports.Recommendation = Recommendation;