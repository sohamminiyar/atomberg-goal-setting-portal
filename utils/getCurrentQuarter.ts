/**
 * Utility to automatically detect the current financial quarter based on the current system date.
 * JS Month indexes are 0-based (0 = January, 11 = December).
 * 
 * Target Quarters:
 * - Q1: April to June (JS Months: 3, 4, 5) -> Due July 31st
 * - Q2: July to September (JS Months: 6, 7, 8) -> Due October 31st
 * - Q3: October to December (JS Months: 9, 10, 11) -> Due January 31st
 * - Q4: January to March (JS Months: 0, 1, 2) -> Due April 30th
 */
export type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export function getCurrentQuarter(): QuarterType {
  const date = new Date()
  const month = date.getMonth()

  if (month >= 3 && month <= 5) {
    return 'Q1'
  } else if (month >= 6 && month <= 8) {
    return 'Q2'
  } else if (month >= 9 && month <= 11) {
    return 'Q3'
  } else {
    return 'Q4'
  }
}

export function getQuarterRangeLabel(quarter: QuarterType): string {
  switch (quarter) {
    case 'Q1':
      return 'April - June'
    case 'Q2':
      return 'July - September'
    case 'Q3':
      return 'October - December'
    case 'Q4':
      return 'January - March'
  }
}

export function getQuarterDueLabel(quarter: QuarterType): string {
  switch (quarter) {
    case 'Q1':
      return 'Due: July 31st'
    case 'Q2':
      return 'Due: October 31st'
    case 'Q3':
      return 'Due: January 31st'
    case 'Q4':
      return 'Due: April 30th'
  }
}

export function getQuarterMonthUpdateLabel(quarter: QuarterType): string {
  switch (quarter) {
    case 'Q1':
      return 'Q1 Progress Update: July'
    case 'Q2':
      return 'Q2 Progress Update: October'
    case 'Q3':
      return 'Q3 Progress Update: January'
    case 'Q4':
      return 'Q4 Progress Update: April'
  }
}
