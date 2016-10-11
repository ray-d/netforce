import calendar
from datetime import datetime

currency={ 
            'th_TH': {'name': '',  'partial': '',  'end': ''}
           , 'en_US': {'name': '', 'partial': '', 'end': ''}
           }
sym={
    "en_US": {
        "positive": "",
        "negative": "MINUS",
        "sep": " ",
        "0": "ZERO",
        "x": ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"],
        "1x": ["TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"],
        "x0": ["TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"],
        "100": "HUNDRED",
        "1K": "THOUSAND",
        "1M": "MILLION",
        "and": "POINT",
    },
    "th_TH": {
        "positive": "",
        "negative": "ลบ",
        "sep": "",
        "0": "ศูนย์",
        "x": ["หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"],
        "x0": ["สิบ","ยี่สิบ","สามสิบ","สี่สิบ","ห้าสิบ","หกสิบ","เจ็ดสิบ","แปดสิบ","เก้าสิบ"],
        "x1": "เอ็ด",
        "100": "ร้อย",
        "1K": "พัน",
        "10K": "หมื่น",
        "100K": "แสน",
        "1M": "ล้าน",
        "and": "",
    }
}

def _num2word(n,l="en_US"):
    number=n
    if number==0:
        return sym[l]["0"] + ""
    elif number<10:
        return sym[l]["x"][number-1]
    elif number<100:
        #if l=="en_US":
        if number<20:
            return sym[l]["1x"][number-10]
        else:
            return sym[l]["x0"][int(number/10-2)]+(number%10 and sym[l]["sep"]+_num2word(number%10,l) or "")
        #elif l=="th_TH":
            #return sym[l]["x0"][int(number/10-1)]+(number%10 and (number%10==1 and sym[l]["x1"] or sym[l]["x"][number%10-1]) or "")
    elif number<1000:
        return sym[l]["x"][int(number/100-1)]+sym[l]["sep"]+sym[l]["100"]+(number%100 and sym[l]["sep"]+_num2word(number%100,l) or "")

    elif number<1000000:
        #if l=="en_US":
        return _num2word(int(number/1000),l)+sym[l]["sep"]+sym[l]["1K"]+(number%1000 and sym[l]["sep"]+_num2word(number%1000,l) or "")
        #elif l=="th_TH":
            #if number<10000:
                #return sym[l]["x"][int(number/1000-1)]+sym[l]["1K"]+(number%1000 and _num2word(number%1000,l) or "")
            #elif number<100000:
                #return sym[l]["x"][int(number/10000-1)]+sym[l]["10K"]+(number%10000 and _num2word(number%10000,l) or "")
            #else:
                #return sym[l]["x"][int(number/100000-1)]+sym[l]["100K"]+(number%100000 and _num2word(number%100000,l) or "")
    elif number<1000000000:
        return _num2word(int(number/1000000),l)+sym[l]["sep"]+sym[l]["1M"]+sym[l]["sep"]+(number%1000000 and _num2word(number%1000000,l) or "")
    else:
        return "N/A"

def num2word(n,l="th_TH"):
    '''
        >>> num2word(-666, 'en_US')
        'MINUS SIX HUNDRED SIXTY SIX BAHT ONLY'

        >>> print num2word(-1024, 'th_TH')
        ลบหนึ่งพันยี่สิบสี่บาทถ้วน

        >>> num2word(42.00, 'en_US')
        'FORTY TWO BAHT ONLY'

        >>> print num2word(42.00, 'th_TH')
        สี่สิบสองบาทถ้วน

        >>> num2word(29348.23, 'en_US')
        'TWENTY NINE THOUSAND THREE HUNDRED FORTY EIGHT BAHT AND TWENTY THREE SATANG'

        >>> print num2word(29348.23, 'th_TH')
        สองหมื่นเก้าพันสามร้อยสี่สิบแปดบาทยี่สิบสามสตางค์

        >>> num2word(293812913.12, 'en_US')
        'TWO HUNDRED NINETY THREE MILLION EIGHT HUNDRED TWELVE THOUSAND NINE HUNDRED THIRTEEN BAHT AND TWELVE SATANG'

        >>> print num2word(293812913.12, 'th_TH')
        สองร้อยเก้าสิบสามล้านแปดแสนหนึ่งหมื่นสองพันเก้าร้อยสิบสามบาทสิบสองสตางค์

        >>> print num2word(0.0, 'th_TH')
        ศูนย์บาทถ้วน

        >>> print num2word(0.75, 'th_TH')
        เจ็ดสิบห้าสตางค์
    '''

    base=0
    end=0
    number = n
    print("number", number)
    if type(n) == type(''):
        number=float(n)
    word = ''
    if type(number) in (int, float):
        sign = 'positive' if number >= 0 else 'negative'
        number = abs(number)
        number = ('%.2f'%number).split('.')
        base = _num2word(int(number[0]),l=l) if int(number[0]) > 0 else 0
        if int(number[1])!=0:
            end = _num2word(int(number[1]),l=l)
        if base != 0 and end == 0:
            word = sym[l][sign] + sym[l]['sep'] + base + sym[l]['sep'] + currency[l]['name'] + sym[l]['sep'] + currency[l]['end']
        if base != 0 and end != 0:
            word = sym[l][sign] + sym[l]['sep'] + base + sym[l]['sep'] + currency[l]['name'] + sym[l]['sep'] + sym[l]['and'] + sym[l]['sep'] + end+sym[l]['sep'] + currency[l]['partial']
        if base == 0 and end != 0:
            word = sym[l][sign] + sym[l]['sep'] + sym[l]['and'] + sym[l]['sep'] + end+sym[l]['sep'] + currency[l]['partial']
        if base == 0 and end == 0:
            base = _num2word(0.00,l=l)
            word = sym[l][sign] + sym[l]['sep'] + base + sym[l]['sep'] + currency[l]['name'] + sym[l]['sep'] + currency[l]['end']
    return word.strip()

